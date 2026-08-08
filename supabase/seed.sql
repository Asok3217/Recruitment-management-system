INSERT INTO public.departments (name, description)
VALUES
    ('Information Technology', 'Technology and software development'),
    ('Human Resources', 'Human resources and recruitment'),
    ('Finance', 'Financial operations and accounting'),
    ('Marketing', 'Marketing and communications'),
    ('Sales', 'Sales and business development')
ON CONFLICT (name) DO NOTHING;