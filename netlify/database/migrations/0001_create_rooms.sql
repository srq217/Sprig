CREATE TABLE vocab_rooms (
 pin TEXT PRIMARY KEY,
 data TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0,
 expires BIGINT NOT NULL
);
CREATE INDEX vocab_rooms_expires_idx ON vocab_rooms (expires);
