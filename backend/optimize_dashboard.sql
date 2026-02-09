-- Create a function to get all dashboard stats in one go
CREATE OR REPLACE FUNCTION get_instructor_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalStudents', (SELECT COUNT(*) FROM users WHERE role IN ('student', 'user')),
        'totalInstructors', (SELECT COUNT(*) FROM users WHERE role IN ('instructor', 'admin')),
        'totalBattles', (SELECT COUNT(*) FROM battles),
        'totalCertificates', (SELECT COUNT(*) FROM certificates),
        'newUsersThisWeek', (
            SELECT COUNT(*) FROM users 
            WHERE role = 'student' 
            AND created_at >= (NOW() - INTERVAL '7 days')
        ),
        'totalApplications', (SELECT COUNT(*) FROM instructor_applications WHERE status = 'pending'),
        'instructorActivity', (
            SELECT json_agg(months)
            FROM (
                SELECT 
                    TO_CHAR(d, 'Mon') as month,
                    (
                        SELECT COUNT(*) 
                        FROM users u 
                        WHERE u.role IN ('instructor', 'admin')
                        AND EXTRACT(MONTH FROM u.created_at) = EXTRACT(MONTH FROM d)
                        AND EXTRACT(YEAR FROM u.created_at) = EXTRACT(YEAR FROM NOW())
                    ) as active
                FROM generate_series(
                    DATE_TRUNC('year', NOW()), 
                    DATE_TRUNC('year', NOW()) + INTERVAL '11 months', 
                    INTERVAL '1 month'
                ) d
            ) months
        )
    ) INTO result;

    RETURN result;
END;
$$;
