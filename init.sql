CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    correlation_id UUID,
    causation_id UUID,
    version INT NOT NULL DEFAULT 1
);

CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_correlation ON events(correlation_id);

CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    state JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS projections_timeline (
    id UUID PRIMARY KEY,
    last_event_timestamp TIMESTAMPTZ,
    total_events INT DEFAULT 0,
    anomalies_detected INT DEFAULT 0
);
