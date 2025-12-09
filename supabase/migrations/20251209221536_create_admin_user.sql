-- Migration: Create admin user helper function
-- Description: Adds a helper function to assign admin role to users by email
-- Usage: SELECT public.make_user_admin('user@example.com');

-- Function to make a user admin by email
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  -- Check if user exists
  IF target_user_id IS NULL THEN
    RETURN 'Error: User not found with email ' || user_email;
  END IF;
  
  -- Insert admin role (or do nothing if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN 'Success: User ' || user_email || ' is now an admin';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.make_user_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.make_user_admin(TEXT) TO service_role;

-- Example usage:
-- SELECT public.make_user_admin('sampayo@gmail.com');
