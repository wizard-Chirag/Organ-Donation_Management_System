-- SELECT u.name , u.gender, u.dob, dp.donor_id ,rp.verification_status as reciverification, dp.verification_status  as donoverification
-- FROM users u FULL JOIN recipient_profile rp ON u.user_id = rp.user_id
-- FULL JOIN donor_profile dp ON u.user_id = dp.user_id
-- WHERE u.gender = 'female'
SELECT u.name, u.gender, u.email, rp.recipient_id, rp.verification_status
from users u JOIN recipient_profile rp ON u.user_id = rp.user_id
WHERE NOT EXISTS (
    SELECT 1 
    FROM donor_profile dp 
    WHERE dp.user_id = rp.user_id
);