import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowLeft, Eye } from 'lucide-react';
import { format } from 'date-fns';

const StudentList = () => {
  const { courseId } = useParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [courseId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('course_enrollments')
            .select(`
                *,
                user:users(*)
            `)
            .eq('course_id', courseId);

        if (error) throw error;
        setStudents(data);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" asChild className="mb-6 pl-0">
         <Link to={`/dashboard/teacher/courses/${courseId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview</Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Enrolled Students</CardTitle>
            <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search students..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No students found matching your search.</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Enrolled Date</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={enrollment.user?.avatar_url} />
                                        <AvatarFallback>{enrollment.user?.full_name?.[0] || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{enrollment.user?.full_name}</div>
                                        <div className="text-xs text-muted-foreground">{enrollment.user?.email}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(enrollment.enrollment_date), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell className="w-[200px]">
                                    <div className="flex items-center gap-2">
                                        <Progress value={enrollment.progress_percentage || 0} className="h-2" />
                                        <span className="text-xs text-muted-foreground w-8">{enrollment.progress_percentage}%</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        enrollment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {enrollment.status === 'completed' ? 'Completed' : 'In Progress'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link to={`/dashboard/teacher/courses/${courseId}/students/${enrollment.user_id}`}>
                                            <Eye className="h-4 w-4 mr-1" /> Details
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentList;