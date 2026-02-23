-- Wind Turbine Inspection Centre — PostgreSQL schema (Neon)
-- Run once manually, or let EF Core handle it:
--   dotnet ef migrations add Init
--   dotnet ef database update

CREATE TABLE IF NOT EXISTS "Turbines" (
    "Id"          TEXT        NOT NULL PRIMARY KEY,
    "Name"        TEXT        NOT NULL DEFAULT '',
    "Location"    TEXT        NOT NULL DEFAULT '',
    "IsOnline"    BOOLEAN     NOT NULL DEFAULT FALSE,
    "LastSeenAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "TurbineMetrics" (
    "Id"                   SERIAL       PRIMARY KEY,
    "TurbineId"            TEXT         NOT NULL REFERENCES "Turbines"("Id"),
    "RecordedAt"           TIMESTAMPTZ  NOT NULL,

    -- Telemetry fields (exact MQTT payload mapping)
    "WindSpeed"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "WindDirection"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "AmbientTemperature"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RotorSpeed"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "PowerOutput"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "NacelleDirection"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "BladePitch"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "GeneratorTemp"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "GearboxTemp"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Vibration"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Status"               TEXT             NOT NULL DEFAULT ''  -- 'running' | 'stopped'
);

CREATE TABLE IF NOT EXISTS "Alerts" (
    "Id"               SERIAL       PRIMARY KEY,
    "TurbineId"        TEXT         NOT NULL REFERENCES "Turbines"("Id"),
    "Severity"         TEXT         NOT NULL DEFAULT '',  -- 'warning' | 'critical' (from broker)
    "Message"          TEXT         NOT NULL DEFAULT '',
    "TriggeredAt"      TIMESTAMPTZ  NOT NULL,
    "IsAcknowledged"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "AcknowledgedAt"   TIMESTAMPTZ,
    "AcknowledgedBy"   TEXT
);

CREATE TABLE IF NOT EXISTS "OperatorCommands" (
    "Id"          SERIAL       PRIMARY KEY,
    "TurbineId"   TEXT         NOT NULL REFERENCES "Turbines"("Id"),
    "Action"      TEXT         NOT NULL DEFAULT '',  -- 'start' | 'stop' | 'setPitch' | 'setInterval'
    "Payload"     TEXT         NOT NULL DEFAULT '',  -- full JSON sent to broker
    "IssuedBy"    TEXT         NOT NULL DEFAULT '',  -- authenticated username
    "IssuedAt"    TIMESTAMPTZ  NOT NULL,
    "Status"      TEXT         NOT NULL DEFAULT 'Sent'  -- 'Sent' | 'Acknowledged' | 'Failed'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_metrics_turbine_time  ON "TurbineMetrics"    ("TurbineId", "RecordedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_turbine_time   ON "Alerts"            ("TurbineId", "TriggeredAt" DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unacked        ON "Alerts"            ("IsAcknowledged") WHERE "IsAcknowledged" = FALSE;
CREATE INDEX IF NOT EXISTS idx_commands_turbine_time ON "OperatorCommands"  ("TurbineId", "IssuedAt" DESC);
