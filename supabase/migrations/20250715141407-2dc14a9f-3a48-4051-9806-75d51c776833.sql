-- Update the existing ZS profile to use the correct mock user ID
UPDATE public.profiles 
SET user_id = '44444444-4444-4444-4444-444444444444' 
WHERE username = 'ZS' AND user_id = '570c3b80-b6a8-45e0-a681-f3923ab26ac1';