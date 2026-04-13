from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional


class AnalyticsService:
    """Analytics powered by advanced PostgreSQL queries."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_trends(
        self,
        neighborhood_id: Optional[int] = None,
        category: Optional[str] = None,
        days: int = 365,
    ) -> list:
        """Time-series incident trends with 7-day rolling average."""
        extra_filters = []
        params = {"days": days}

        if neighborhood_id is not None:
            extra_filters.append("neighborhood_id = :neighborhood_id")
            params["neighborhood_id"] = neighborhood_id
        if category:
            extra_filters.append("category = :category")
            params["category"] = category

        extra_sql = "AND " + " AND ".join(extra_filters) if extra_filters else ""

        query = text(f"""
            SELECT
                incident_date::text AS date,
                SUM(incident_count)::int AS count,
                ROUND(
                    AVG(SUM(incident_count)) OVER (
                        ORDER BY incident_date
                        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                    )::numeric, 2
                )::float AS rolling_avg_7d
            FROM mv_daily_incident_counts
            WHERE incident_date > NOW() - MAKE_INTERVAL(days => :days)
            {extra_sql}
            GROUP BY incident_date
            ORDER BY incident_date
        """)

        result = await self.db.execute(query, params)
        return [dict(r._mapping) for r in result.fetchall()]

    async def compare_neighborhoods(self, days: int = 365) -> list:
        """Compare neighborhoods using CTEs for current vs previous period."""
        query = text("""
            WITH current_period AS (
                SELECT
                    n.id AS neighborhood_id,
                    n.name,
                    COUNT(i.id)::int AS current_count
                FROM neighborhoods n
                LEFT JOIN incidents i ON i.neighborhood_id = n.id
                    AND i.open_dt > NOW() - MAKE_INTERVAL(days => :days)
                GROUP BY n.id, n.name
            ),
            previous_period AS (
                SELECT
                    n.id AS neighborhood_id,
                    COUNT(i.id)::int AS previous_count
                FROM neighborhoods n
                LEFT JOIN incidents i ON i.neighborhood_id = n.id
                    AND i.open_dt BETWEEN
                        NOW() - MAKE_INTERVAL(days => :days * 2)
                        AND NOW() - MAKE_INTERVAL(days => :days)
                GROUP BY n.id
            )
            SELECT
                c.neighborhood_id,
                c.name,
                c.current_count,
                p.previous_count,
                CASE
                    WHEN p.previous_count > 0 THEN
                        ROUND(
                            ((c.current_count - p.previous_count)::numeric
                             / p.previous_count * 100), 1
                        )::float
                    ELSE NULL
                END AS pct_change
            FROM current_period c
            JOIN previous_period p ON c.neighborhood_id = p.neighborhood_id
            ORDER BY c.current_count DESC
        """)

        result = await self.db.execute(query, {"days": days})
        return [dict(r._mapping) for r in result.fetchall()]

    async def get_resolution_times(self) -> list:
        """Average resolution time by category with ranking."""
        query = text("""
            SELECT
                category,
                COUNT(*)::int AS total,
                ROUND(AVG(
                    EXTRACT(EPOCH FROM (closed_dt - open_dt)) / 3600
                )::numeric, 1)::float AS avg_hours,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
                    ORDER BY EXTRACT(EPOCH FROM (closed_dt - open_dt)) / 3600
                )::numeric, 1)::float AS median_hours
            FROM incidents
            WHERE closed_dt IS NOT NULL
            AND closed_dt > open_dt
            GROUP BY category
            HAVING COUNT(*) >= 5
            ORDER BY avg_hours ASC
        """)

        result = await self.db.execute(query)
        return [dict(r._mapping) for r in result.fetchall()]

    async def get_category_breakdown(
        self, neighborhood_id: Optional[int] = None, days: int = 365
    ) -> list:
        """Incident counts by category."""
        extra_filter = ""
        params = {"days": days}

        if neighborhood_id is not None:
            extra_filter = "AND neighborhood_id = :neighborhood_id"
            params["neighborhood_id"] = neighborhood_id

        query = text(f"""
            SELECT
                category,
                COUNT(*)::int AS count,
                COUNT(CASE WHEN status = 'Open' THEN 1 END)::int AS open_count,
                COUNT(CASE WHEN status = 'Closed' THEN 1 END)::int AS closed_count
            FROM incidents
            WHERE open_dt > NOW() - MAKE_INTERVAL(days => :days)
            {extra_filter}
            GROUP BY category
            ORDER BY count DESC
        """)

        result = await self.db.execute(query, params)
        return [dict(r._mapping) for r in result.fetchall()]

    async def get_summary(self) -> dict:
        """City-wide summary dashboard stats."""
        stats_query = text("""
            SELECT
                (SELECT COUNT(*) FROM incidents)::int AS total_incidents,
                (SELECT COUNT(*) FROM crimes)::int AS total_crimes,
                (SELECT COUNT(*) FROM incidents WHERE status = 'Open')::int AS open_incidents,
                (SELECT ROUND(AVG(
                    EXTRACT(EPOCH FROM (closed_dt - open_dt)) / 3600
                )::numeric, 1)
                FROM incidents WHERE closed_dt IS NOT NULL
                AND closed_dt > open_dt)::float AS avg_resolution_hours,
                (SELECT COUNT(*) FROM crimes WHERE shooting = true)::int AS total_shootings
        """)
        result = await self.db.execute(stats_query)
        stats = dict(result.fetchone()._mapping)

        cat_query = text("""
            SELECT category, COUNT(*)::int AS count
            FROM incidents
            GROUP BY category
            ORDER BY count DESC
            LIMIT 5
        """)
        cat_result = await self.db.execute(cat_query)
        stats["top_categories"] = [dict(r._mapping) for r in cat_result.fetchall()]

        hood_query = text("""
            SELECT n.name, COUNT(i.id)::int AS count
            FROM neighborhoods n
            JOIN incidents i ON i.neighborhood_id = n.id
            GROUP BY n.name
            ORDER BY count DESC
            LIMIT 5
        """)
        hood_result = await self.db.execute(hood_query)
        stats["top_neighborhoods"] = [dict(r._mapping) for r in hood_result.fetchall()]

        return stats