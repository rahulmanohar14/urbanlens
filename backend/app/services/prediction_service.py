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
    """ML prediction service: Holt-Winters Exponential Smoothing forecasting."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def forecast_incidents(
        self,
        neighborhood_id: int,
        days_ahead: int = 30,
        category: Optional[str] = None,
    ) -> dict:
        """Run Holt-Winters forecast on historical incident data."""

        if not STATS_AVAILABLE:
            return {"error": "statsmodels is not installed. Run: pip install statsmodels"}

        extra_filter = "AND category = :category" if category else ""
        params = {"nid": neighborhood_id}
        if category:
            params["category"] = category

        query = text(f"""
            SELECT
                incident_date AS ds,
                SUM(incident_count)::int AS y
            FROM mv_daily_incident_counts
            WHERE neighborhood_id = :nid
            {extra_filter}
            GROUP BY incident_date
            ORDER BY incident_date
        """)

        result = await self.db.execute(query, params)
        rows = result.fetchall()

        if len(rows) < 30:
            return {"error": f"Not enough data for forecasting (need 30+ days, got {len(rows)})"}

        # Build dataframe
        df = pd.DataFrame([{"ds": r[0], "y": float(r[1])} for r in rows])
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.set_index("ds").asfreq("D", fill_value=0)

        # Train Holt-Winters Exponential Smoothing
        try:
            model = ExponentialSmoothing(
                df["y"],
                seasonal_periods=7,
                trend="add",
                seasonal="add",
                initialization_method="estimated",
            ).fit(optimized=True)

            # Generate forecast
            forecast_values = model.forecast(days_ahead)

            # Calculate confidence intervals (using residual std)
            residuals = model.resid
            std = residuals.std()

            last_date = df.index[-1]
            forecast_points = []
            for i, val in enumerate(forecast_values):
                date = last_date + timedelta(days=i + 1)
                predicted = max(0, round(float(val), 2))
                forecast_points.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "predicted": predicted,
                    "lower_bound": max(0, round(predicted - 1.28 * std, 2)),
                    "upper_bound": round(predicted + 1.28 * std, 2),
                })

        except Exception as e:
            # Fallback: simple moving average if Holt-Winters fails
            recent = df["y"].tail(14).mean()
            std = df["y"].tail(14).std()
            last_date = df.index[-1]
            forecast_points = []
            for i in range(days_ahead):
                date = last_date + timedelta(days=i + 1)
                forecast_points.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "predicted": round(max(0, float(recent)), 2),
                    "lower_bound": round(max(0, float(recent - 1.28 * std)), 2),
                    "upper_bound": round(float(recent + 1.28 * std), 2),
                })

        # Historical for context (last 90 days)
        historical = [
            {"date": idx.strftime("%Y-%m-%d"), "count": int(row["y"])}
            for idx, row in df.tail(90).iterrows()
        ]

        return {"forecast": forecast_points, "historical": historical}