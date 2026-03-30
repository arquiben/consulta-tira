-- Migrations for Consulfision 2026
-- Execute this in your Supabase SQL Editor

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  age TEXT,
  gender TEXT,
  blood_type TEXT,
  weight TEXT,
  height TEXT,
  bmi TEXT,
  blood_pressure TEXT,
  address TEXT,
  phone TEXT,
  history TEXT,
  complaints TEXT,
  last_consultation TIMESTAMP WITH TIME ZONE,
  anatomical_markers JSONB DEFAULT '[]'::jsonb,
  consultation_history JSONB DEFAULT '[]'::jsonb,
  exam_requests JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Frequency Protocols Table
CREATE TABLE IF NOT EXISTS frequency_protocols (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  frequency FLOAT NOT NULL,
  wave_type TEXT NOT NULL,
  description TEXT,
  is_mixture BOOLEAN DEFAULT FALSE,
  mixture_frequencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Iridology Analysis Table
CREATE TABLE IF NOT EXISTS iridology_analysis (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT NOT NULL,
  zones JSONB NOT NULL,
  interpretation TEXT,
  suggested_protocol JSONB,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Protocols Table
CREATE TABLE IF NOT EXISTS custom_protocols (
  id UUID PRIMARY KEY,
  therapy TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  sessions INTEGER DEFAULT 1,
  revaluation_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinic Settings Table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id TEXT PRIMARY KEY, -- Use 'current_settings' as ID
  therapist_name TEXT,
  clinic_name TEXT,
  license_type TEXT,
  is_activated BOOLEAN DEFAULT FALSE,
  activation_date TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  language TEXT DEFAULT 'pt',
  access_password TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequency_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE iridology_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for authenticated users for now, or simplify for demo)
-- In a real app, you'd scope this to user_id
CREATE POLICY "Allow all for authenticated users" ON patients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON frequency_protocols FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON iridology_analysis FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON custom_protocols FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON clinic_settings FOR ALL USING (auth.role() = 'authenticated');
