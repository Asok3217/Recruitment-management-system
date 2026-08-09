-- =========================================================
-- RMS DEVELOPMENT SEED DATA
-- =========================================================

-- ---------------------------------------------------------
-- DEPARTMENTS
-- ---------------------------------------------------------

INSERT INTO public.departments (name, description)
VALUES
  ('Information Technology', 'Technology and software development'),
  ('Human Resources', 'Human resources and recruitment'),
  ('Finance', 'Financial operations and accounting'),
  ('Marketing', 'Marketing and communications'),
  ('Sales', 'Sales and business development')
ON CONFLICT (name) DO NOTHING;


-- ---------------------------------------------------------
-- COMPANIES
-- ---------------------------------------------------------

INSERT INTO public.companies
  (name, logo_url, website_url, description, location, industry)
VALUES
  (
    'TechNova Solutions',
    NULL,
    'https://technova.example.com',
    'Software development and digital technology solutions.',
    'Kathmandu, Nepal',
    'Information Technology'
  ),
  (
    'Himalayan Digital',
    NULL,
    'https://himalayandigital.example.com',
    'Digital products, web applications and cloud solutions.',
    'Kathmandu, Nepal',
    'Information Technology'
  ),
  (
    'CloudPeak Technologies',
    NULL,
    'https://cloudpeak.example.com',
    'Cloud infrastructure and enterprise software solutions.',
    'Pokhara, Nepal',
    'Information Technology'
  ),
  (
    'Everest Fintech',
    NULL,
    'https://everestfintech.example.com',
    'Technology-driven financial products and services.',
    'Kathmandu, Nepal',
    'Financial Technology'
  ),
  (
    'Pokhara Tech Labs',
    NULL,
    'https://pokharatech.example.com',
    'Product development and technology consulting.',
    'Pokhara, Nepal',
    'Information Technology'
  )
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------
-- GET RECRUITER
-- ---------------------------------------------------------

DO $$
DECLARE
  recruiter_id UUID;
  it_department_id UUID;
  company_id UUID;
BEGIN

  SELECT id
  INTO recruiter_id
  FROM public.profiles
  WHERE role = 'recruiter'
  ORDER BY created_at
  LIMIT 1;

  IF recruiter_id IS NULL THEN
    RAISE EXCEPTION 'No recruiter profile found.';
  END IF;


  SELECT id
  INTO it_department_id
  FROM public.departments
  WHERE name = 'Information Technology'
  LIMIT 1;


  -- -------------------------------------------------------
  -- TECHNOVA JOB
  -- -------------------------------------------------------

  SELECT id
  INTO company_id
  FROM public.companies
  WHERE name = 'TechNova Solutions'
  LIMIT 1;

  INSERT INTO public.jobs (
    title,
    description,
    requirements,
    responsibilities,
    department_id,
    created_by,
    company_id,
    location,
    employment_type,
    experience_level,
    salary_min,
    salary_max,
    application_deadline,
    status
  )
  VALUES (
    'Full Stack Developer',
    'We are looking for a Full Stack Developer to build scalable and modern web applications.',
    'Experience with React, Next.js, Node.js, TypeScript and PostgreSQL.',
    'Develop web applications, build APIs, work with databases and collaborate with the product team.',
    it_department_id,
    recruiter_id,
    company_id,
    'Kathmandu, Nepal',
    'full_time',
    'mid',
    70000,
    120000,
    CURRENT_DATE + INTERVAL '30 days',
    'published'
  );


  -- -------------------------------------------------------
  -- HIMALAYAN DIGITAL
  -- -------------------------------------------------------

  SELECT id
  INTO company_id
  FROM public.companies
  WHERE name = 'Himalayan Digital'
  LIMIT 1;

  INSERT INTO public.jobs (
    title,
    description,
    requirements,
    responsibilities,
    department_id,
    created_by,
    company_id,
    location,
    employment_type,
    experience_level,
    salary_min,
    salary_max,
    application_deadline,
    status
  )
  VALUES (
    'Frontend Developer',
    'Join our frontend team to create fast, accessible and beautiful user experiences.',
    'React, TypeScript, JavaScript, CSS and responsive design experience.',
    'Build reusable UI components, implement responsive interfaces and collaborate with designers.',
    it_department_id,
    recruiter_id,
    company_id,
    'Kathmandu, Nepal',
    'full_time',
    'entry',
    50000,
    85000,
    CURRENT_DATE + INTERVAL '25 days',
    'published'
  );


  -- -------------------------------------------------------
  -- CLOUDPEAK
  -- -------------------------------------------------------

  SELECT id
  INTO company_id
  FROM public.companies
  WHERE name = 'CloudPeak Technologies'
  LIMIT 1;

  INSERT INTO public.jobs (
    title,
    description,
    requirements,
    responsibilities,
    department_id,
    created_by,
    company_id,
    location,
    employment_type,
    experience_level,
    salary_min,
    salary_max,
    application_deadline,
    status
  )
  VALUES (
    'Backend Developer',
    'Develop reliable backend services and APIs for enterprise applications.',
    'Node.js, REST APIs, PostgreSQL and backend development experience.',
    'Design APIs, maintain database systems and improve backend performance.',
    it_department_id,
    recruiter_id,
    company_id,
    'Pokhara, Nepal',
    'full_time',
    'mid',
    65000,
    110000,
    CURRENT_DATE + INTERVAL '28 days',
    'published'
  );


  -- -------------------------------------------------------
  -- EVEREST FINTECH
  -- -------------------------------------------------------

  SELECT id
  INTO company_id
  FROM public.companies
  WHERE name = 'Everest Fintech'
  LIMIT 1;

  INSERT INTO public.jobs (
    title,
    description,
    requirements,
    responsibilities,
    department_id,
    created_by,
    company_id,
    location,
    employment_type,
    experience_level,
    salary_min,
    salary_max,
    application_deadline,
    status
  )
  VALUES (
    'Data Analyst',
    'Analyze business data and generate insights that support financial decision making.',
    'SQL, Excel, Python and data visualization skills.',
    'Analyze datasets, create reports and dashboards, and communicate insights to stakeholders.',
    it_department_id,
    recruiter_id,
    company_id,
    'Kathmandu, Nepal',
    'full_time',
    'entry',
    55000,
    90000,
    CURRENT_DATE + INTERVAL '35 days',
    'published'
  );


  -- -------------------------------------------------------
  -- POKHARA TECH LABS
  -- -------------------------------------------------------

  SELECT id
  INTO company_id
  FROM public.companies
  WHERE name = 'Pokhara Tech Labs'
  LIMIT 1;

  INSERT INTO public.jobs (
    title,
    description,
    requirements,
    responsibilities,
    department_id,
    created_by,
    company_id,
    location,
    employment_type,
    experience_level,
    salary_min,
    salary_max,
    application_deadline,
    status
  )
  VALUES (
    'UI/UX Designer',
    'Design intuitive and engaging digital experiences for web and mobile products.',
    'Figma, UX research, wireframing and prototyping.',
    'Create user flows, wireframes, prototypes and high-fidelity interfaces.',
    it_department_id,
    recruiter_id,
    company_id,
    'Pokhara, Nepal',
    'full_time',
    'entry',
    45000,
    80000,
    CURRENT_DATE + INTERVAL '21 days',
    'published'
  );

END $$;