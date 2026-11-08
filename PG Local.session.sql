SELECT u.name , u.gender, u.dob, rp.verification_status as reciverification, dp.verification_status  as donoverification
FROM users u FULL JOIN recipient_profile rp ON u.user_id = rp.user_id
FULL JOIN donor_profile dp ON u.user_id = dp.user_id
WHERE u.gender = 'male'
