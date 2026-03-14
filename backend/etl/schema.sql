-- Zahauton People Search Engine — PostgreSQL Schema
-- 8.3M person records from Israeli population registry

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Main people table
CREATE TABLE IF NOT EXISTS people (
    row_id      INTEGER PRIMARY KEY,
    tz          VARCHAR(9) UNIQUE NOT NULL,
    
    -- Names
    family_name     TEXT,
    first_name      TEXT,
    prev_name       TEXT,     -- שם קודם (maiden name)
    father_name     TEXT,     -- שם האב
    mother_name     TEXT,     -- שם האם
    
    -- Parents TZ
    father_tz       VARCHAR(9),
    mother_tz       VARCHAR(9),
    
    -- Address
    city            TEXT,
    street          TEXT,
    house_num       TEXT,
    zipcode         TEXT,
    
    -- Phone
    phone_area      TEXT,     -- קידומת
    phone           TEXT,     -- טלפון
    extra_phones    TEXT,     -- טלפונים נוספים
    
    -- Birth (civil)
    birth_year      TEXT,
    birth_month     TEXT,
    birth_day       TEXT,
    birth_dow       TEXT,     -- יום בשבוע
    
    -- Birth (Hebrew)
    heb_year        TEXT,     -- שנהע
    heb_month       TEXT,     -- חודשע
    heb_day         TEXT,     -- יוםע
    
    -- Aliyah
    aliya_year      TEXT,     -- שנהעליה
    aliya_month     TEXT,     -- חודשעליה
    aliya_day       TEXT,     -- יוםעליה
    
    -- Other
    birth_country   TEXT,     -- ארץ לידה
    marital         TEXT,     -- מצב אישי
    clan            TEXT      -- בית אב
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_people_tz ON people(tz);
CREATE INDEX IF NOT EXISTS idx_people_family_trgm ON people USING gin(family_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_people_first_trgm ON people USING gin(first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_people_city_trgm ON people USING gin(city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone);
CREATE INDEX IF NOT EXISTS idx_people_father_tz ON people(father_tz);
CREATE INDEX IF NOT EXISTS idx_people_mother_tz ON people(mother_tz);
CREATE INDEX IF NOT EXISTS idx_people_family_first ON people(family_name, first_name);
CREATE INDEX IF NOT EXISTS idx_people_family_city ON people(family_name, city);
CREATE INDEX IF NOT EXISTS idx_people_street ON people(street);
