CREATE TABLE usage_tracking (
  device_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, date)
);

CREATE OR REPLACE FUNCTION check_and_increment_usage(p_device_id TEXT, p_limit INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO usage_tracking (device_id, date, count)
  VALUES (p_device_id, CURRENT_DATE, 0)
  ON CONFLICT (device_id, date) DO NOTHING;

  SELECT count INTO v_count FROM usage_tracking
  WHERE device_id = p_device_id AND date = CURRENT_DATE;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE usage_tracking
  SET count = count + 1
  WHERE device_id = p_device_id AND date = CURRENT_DATE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
