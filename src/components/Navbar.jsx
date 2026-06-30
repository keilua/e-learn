import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import SearchBar from '@/components/search/SearchBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, BookOpen, User, LogOut, Settings, History, Edit, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, profile, logout, role } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name
      ? name.split(' ').map((n) => n[0]).join('').toUpperCase()
      : 'U';
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email;
  const displayAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url;
  
  // Helper to check for teacher/instructor roles
  const isTeacher = ['instructor', 'teacher', 'professor'].includes(role);

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary shrink-0">
          <BookOpen className="h-6 w-6" />
          <span className="hidden sm:inline">EduPlatform</span>
        </Link>

        {/* Search Bar - Center */}
        <div className="hidden md:block flex-grow max-w-md mx-4">
           <SearchBar />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <Link to="/courses" className="text-sm font-medium hover:text-primary transition-colors">
            Courses
          </Link>
          {user && (
            <>
               <Link to="/forum" className="text-sm font-medium hover:text-primary transition-colors">
                 Community
               </Link>
               
               {/* Teacher Dashboard Link */}
               {isTeacher && (
                  <Link 
                    to="/teacher-dashboard" 
                    className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
                  >
                     <LayoutDashboard className="h-4 w-4" />
                     Teacher Dashboard
                  </Link>
               )}
               
               {/* Student Dashboard Link (only if not teacher, or for everyone?) 
                   Usually teachers also want to see student view, but based on prompt, let's keep it simple.
                   Existing code hid it for instructors. I'll keep that logic but allow accessing via menu.
               */}
               {!isTeacher && (
                  <Link to="/dashboard/student" className="text-sm font-medium hover:text-primary transition-colors">
                     My Learning
                  </Link>
               )}
            </>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={displayAvatar} alt={displayName} className="object-cover" />
                      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard/student')}>
                    <User className="mr-2 h-4 w-4" /> Student Dashboard
                  </DropdownMenuItem>
                  {isTeacher && (
                    <DropdownMenuItem onClick={() => navigate('/teacher-dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Teacher Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/dashboard/student/profile')}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings/notifications')}>
                    <Settings className="mr-2 h-4 w-4" /> Notifications
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => navigate('/search/history')}>
                    <History className="mr-2 h-4 w-4" /> Search History
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-4 bg-background">
          <div className="pb-4 border-b mb-4">
             <SearchBar />
          </div>
          
          <Link to="/courses" className="block text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
            Courses
          </Link>
          {user ? (
            <>
              {isTeacher && (
                <Link to="/teacher-dashboard" className="block text-sm font-medium text-primary" onClick={() => setIsMenuOpen(false)}>
                  Teacher Dashboard
                </Link>
              )}
              <Link to="/dashboard/student" className="block text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                My Learning
              </Link>
              <Link to="/forum" className="block text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                Community
              </Link>
              <div className="pt-2 border-t mt-2">
                 <div className="flex items-center gap-2 mb-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={displayAvatar} className="object-cover" />
                      <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{displayName}</span>
                 </div>
                 <Button variant="outline" className="w-full justify-start mb-2" onClick={() => { setIsMenuOpen(false); navigate('/dashboard/student/profile'); }}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                 </Button>
                 <Button variant="outline" className="w-full justify-start mb-2" onClick={() => { setIsMenuOpen(false); navigate('/search/history'); }}>
                    <History className="mr-2 h-4 w-4" /> Search History
                 </Button>
                 <Button variant="outline" className="w-full justify-start mb-2" onClick={() => { setIsMenuOpen(false); navigate('/settings/notifications'); }}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                 </Button>
                 <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full justify-start">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                 </Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" asChild onClick={() => setIsMenuOpen(false)}>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild onClick={() => setIsMenuOpen(false)}>
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;