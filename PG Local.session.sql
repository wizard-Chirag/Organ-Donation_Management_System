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

-- select * FROM donor_organ

 select  
				d_o.donor_id,
                d_o.organ_id,
                d_o.verified_hospital_id,
                d_o.verified_at,
                d_o.donor_consent,
                d_o.consent_provided_at,
                d_o.availability_status,
                d_o.registered_at,
                h.hospital_name,
                u.name AS donor_name,
                u.user_id,
                m.bloodgroup,
                ot.organ_name
                
                from donor_organ d_o
                
                JOIN donor_profile dp
                ON d_o.donor_id = dp.donor_id
                
                JOIN users u
                ON u.user_id = dp.user_id
                
                JOIN user_medical_info m
                ON m.user_id = u.user_id
                
                JOIN organ_type ot
                ON ot.organ_id = d_o.organ_id
                
                JOIN hospital h
                ON h.hospital_id = d_o.verified_hospital_id
                Where 1=1