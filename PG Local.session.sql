-- select 
--             u.user_id,
--             d.donor_id,
--             u.name,
--             u.gender,
--             m.bloodgroup,
--             u.dob,
--             d.registered_hospital_id,
--             d.attested_document_path,
--             d.verification_status,
--             d.registered_at

--             FROM users u
--             JOIN donor_profile d
--             ON u.user_id = d.user_id
--             JOIN user_medical_info m
--             ON u.user_id = m.user_id
--             where d.verification_status = 'Pending';

-- SELECT  d.*, r.* from donor_profile d JOIN recipient_profile r on r.user_id = d.user_id/
SELECT d.donor_id, r.recipent_id from donor_profile FULL JOIN 