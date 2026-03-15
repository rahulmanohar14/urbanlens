"""add_materialized_views_and_audit_trigger"""

from alembic import op

# revision identifiers, used by Alembic.
revision = 'YOUR_REVISION_ID_HERE' 
down_revision = '7b5510684e11'
branch_labels = None
depends_on = None

def upgrade():
    # Materialized View: Daily incident counts
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_incident_counts AS
        SELECT
            neighborhood_id,
            category,
            DATE(open_dt) AS incident_date,
            COUNT(*) AS incident_count,
            COUNT(CASE WHEN status = 'Closed' THEN 1 END) AS closed_count
        FROM incidents
        GROUP BY neighborhood_id, category, DATE(open_dt);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_incidents
            ON mv_daily_incident_counts(neighborhood_id, category, incident_date);
    """)

    # Materialized View: Neighborhood stats
    op.execute("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS mv_neighborhood_stats AS
        SELECT
            n.id AS neighborhood_id,
            n.name,
            COUNT(DISTINCT i.id) AS total_incidents,
            COUNT(DISTINCT c.id) AS total_crimes,
            COUNT(DISTINCT i.id) FILTER (
                WHERE i.open_dt > NOW() - INTERVAL '30 days'
            ) AS incidents_last_30d,
            COUNT(DISTINCT c.id) FILTER (
                WHERE c.occurred_on > NOW() - INTERVAL '30 days'
            ) AS crimes_last_30d,
            ROUND(AVG(
                EXTRACT(EPOCH FROM (i.closed_dt - i.open_dt)) / 3600
            )::numeric, 1) AS avg_resolution_hours
        FROM neighborhoods n
        LEFT JOIN incidents i ON i.neighborhood_id = n.id
        LEFT JOIN crimes c ON c.neighborhood_id = n.id
        GROUP BY n.id, n.name;
    """)

    # Audit Trail Trigger Function
    op.execute("""
        CREATE OR REPLACE FUNCTION audit_trigger_func()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                INSERT INTO audit_trail (table_name, record_id, action, new_values)
                VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::text);
                RETURN NEW;
            ELSIF TG_OP = 'UPDATE' THEN
                INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values)
                VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE',
                        row_to_json(OLD)::text, row_to_json(NEW)::text);
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                INSERT INTO audit_trail (table_name, record_id, action, old_values)
                VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::text);
                RETURN OLD;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Attach trigger to incidents table
    op.execute("""
        CREATE TRIGGER incidents_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON incidents
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS incidents_audit_trigger ON incidents;")
    op.execute("DROP FUNCTION IF EXISTS audit_trigger_func;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_neighborhood_stats;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mv_daily_incident_counts;")