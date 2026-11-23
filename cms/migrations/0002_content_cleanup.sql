CREATE TABLE IF NOT EXISTS release_entities(release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,entity_id TEXT NOT NULL,PRIMARY KEY(release_id,entity_id));
CREATE INDEX IF NOT EXISTS release_entities_entity ON release_entities(entity_id);
CREATE TABLE IF NOT EXISTS release_indexed(release_id TEXT PRIMARY KEY REFERENCES releases(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS object_deletions(object_key TEXT PRIMARY KEY,created_at TEXT NOT NULL);
