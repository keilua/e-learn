import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Users, GraduationCap, BookOpen, Award, FileCheck2, ClipboardList, Heart, UserCog,
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, description, loading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    admins: 0,
    courses: 0,
    publishedCourses: 0,
    enrollments: 0,
    quizAttempts: 0,
    certificates: 0,
  });

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const [
        { count: students },
        { count: teachers },
        { count: admins },
        { count: courses },
        { count: publishedCourses },
        { count: enrollments },
        { count: quizAttempts },
        { count: certificates },
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('users').select('id', { count: 'exact', head: true }).in('role', ['instructor', 'teacher', 'professor']),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('certificates').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        students: students || 0,
        teachers: teachers || 0,
        admins: admins || 0,
        courses: courses || 0,
        publishedCourses: publishedCourses || 0,
        enrollments: enrollments || 0,
        quizAttempts: quizAttempts || 0,
        certificates: certificates || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Admin Dashboard | E-Learn</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord administrateur</h1>
          <p className="text-muted-foreground">Statistiques globales de la plateforme.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/users">
              <UserCog className="mr-2 h-4 w-4" /> Gérer les utilisateurs
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/donations">
              <Heart className="mr-2 h-4 w-4 text-red-500" /> Dons
            </Link>
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Utilisateurs</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard title="Étudiants" value={stats.students} icon={GraduationCap} loading={loading} />
        <StatCard title="Professeurs" value={stats.teachers} icon={Users} loading={loading} />
        <StatCard title="Administrateurs" value={stats.admins} icon={UserCog} loading={loading} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Contenu &amp; activité</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Cours"
          value={stats.courses}
          icon={BookOpen}
          description={`${stats.publishedCourses} publiés`}
          loading={loading}
        />
        <StatCard title="Inscriptions" value={stats.enrollments} icon={ClipboardList} loading={loading} />
        <StatCard title="Tentatives de quiz" value={stats.quizAttempts} icon={FileCheck2} loading={loading} />
        <StatCard title="Certificats délivrés" value={stats.certificates} icon={Award} loading={loading} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Gestion des utilisateurs et rôles</CardTitle>
          <CardDescription>
            Attribuez les rôles administrateur, professeur ou étudiant et gérez les comptes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/admin/users">
              <UserCog className="mr-2 h-4 w-4" /> Ouvrir la gestion des utilisateurs
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
