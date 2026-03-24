# backend/app/services/prediction_service.py

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import pandas as pd
import numpy as np
from datetime import timedelta

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    STATS_AVAILABLE = True
except ImportError:
    STATS_AVAILABLE = False


class PredictionService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def forecast_incidents(
        self,
        neighborhood_id: Optional[int] = None,
        days_ahead: int = 30,
        category: Optional[str] = None,
        aggregation: str = "daily",
    ) -> dict:
        """Run Holt-Winters forecast. If neighborhood_id is None, forecasts city-wide."""

        if not STATS_AVAILABLE:
            return {"error": "statsmodels is not installed. Run: pip install statsmodels"}

        # Build query based on whether city-wide or per-neighborhood
        filters = []
        params = {}

        if neighborhood_id is not None:
            filters.append("neighborhood_id = :nid")
            params["nid"] = neighborhood_id

        if category:
            filters.append("category = :category")
            params["category"] = category

        where_sql = "WHERE " + " AND ".join(filters) if filters else ""

        if aggregation == "weekly":
            query = text(f"""
                SELECT
                    DATE_TRUNC('week', incident_date)::date AS ds,
                    SUM(incident_count)::int AS y
                FROM mv_daily_incident_counts
                {where_sql}
                GROUP BY DATE_TRUNC('week', incident_date)
                ORDER BY ds
            """)
        else:
            query = text(f"""
                SELECT
                    incident_date AS ds,
                    SUM(incident_count)::int AS y
                FROM mv_daily_incident_counts
                {where_sql}
                GROUP BY incident_date
                ORDER BY incident_date
            """)

        result = await self.db.execute(query, params)
        rows = result.fetchall()

        min_rows = 14 if aggregation == "weekly" else 30
        if len(rows) < min_rows:
            return {"error": f"Not enough data for forecasting (need {min_rows}+ data points, got {len(rows)})"}

        # Build dataframe
        df = pd.DataFrame([{"ds": r[0], "y": float(r[1])} for r in rows])
        df["ds"] = pd.to_datetime(df["ds"])

        freq = "W" if aggregation == "weekly" else "D"
        df = df.set_index("ds").asfreq(freq, fill_value=0)

        # Determine seasonal period
        seasonal_period = 52 if aggregation == "weekly" and len(df) > 104 else 7 if aggregation == "daily" else None

        # Train model
        try:
            # Use only last 180 days of data to avoid early sparse periods
            if len(df) > 180:
                df = df.tail(180)

            # Remove trailing zeros (incomplete data at end)
            while len(df) > 30 and df["y"].iloc[-1] == 0:
                df = df.iloc[:-1]

            if seasonal_period and len(df) >= seasonal_period * 2:
                model = ExponentialSmoothing(
                    df["y"],
                    seasonal_periods=seasonal_period,
                    trend="add",
                    seasonal="add",
                    damped_trend=True,
                    initialization_method="estimated",
                ).fit(optimized=True)
            else:
                model = ExponentialSmoothing(
                    df["y"],
                    trend="add",
                    damped_trend=True,
                    seasonal=None,
                    initialization_method="estimated",
                ).fit(optimized=True)

            forecast_periods = days_ahead if aggregation == "daily" else max(4, days_ahead // 7)
            forecast_values = model.forecast(forecast_periods)

            residuals = model.resid
            std = residuals.std()

            last_date = df.index[-1]
            step = timedelta(weeks=1) if aggregation == "weekly" else timedelta(days=1)

            forecast_points = []
            for i, val in enumerate(forecast_values):
                date = last_date + step * (i + 1)
                predicted = max(0, round(float(val), 2))
                forecast_points.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "predicted": predicted,
                    "lower_bound": max(0, round(predicted - 1.28 * std, 2)),
                    "upper_bound": round(predicted + 1.28 * std, 2),
                })

        except Exception as e:
            # Fallback: simple moving average
            window = 4 if aggregation == "weekly" else 14
            recent = df["y"].tail(window).mean()
            std = df["y"].tail(window).std()
            last_date = df.index[-1]
            step = timedelta(weeks=1) if aggregation == "weekly" else timedelta(days=1)
            forecast_periods = days_ahead if aggregation == "daily" else max(4, days_ahead // 7)

            forecast_points = []
            for i in range(forecast_periods):
                date = last_date + step * (i + 1)
                forecast_points.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "predicted": round(max(0, float(recent)), 2),
                    "lower_bound": round(max(0, float(recent - 1.28 * std)), 2),
                    "upper_bound": round(float(recent + 1.28 * std), 2),
                })

        # Historical for context
        tail_size = 52 if aggregation == "weekly" else 90
        historical = [
            {"date": idx.strftime("%Y-%m-%d"), "count": int(row["y"])}
            for idx, row in df.tail(tail_size).iterrows()
        ]

        return {"forecast": forecast_points, "historical": historical}