import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';

const LandingPage = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div
            className='min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 overflow-hidden relative'
            style={{
                background: `radial-gradient(100% 100% at 50% 100%, var(--Gradients-Main-Color-4, #FF9875) 0%, var(--Gradients-Main-Color-3, #B452FF) 15%, var(--Gradients-Main-Color-2, #673DE6) 30%, transparent 80%)`
            }}
        >
            <Helmet>
                <title>Crow Educ — Apprends à coder à ton rythme</title>
                <meta name="description" content="Des cours structurés, des quiz et des certificats pour apprendre à coder à ton rythme, avec Crow Educ." />
            </Helmet>

            <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className='flex flex-col items-center gap-5 w-full max-w-lg text-center'
            >
                <Logo size={72} />

                <div className='flex flex-col gap-2'>
                    <h1 className='text-3xl sm:text-4xl font-bold text-white leading-tight text-balance'>
                        Apprends à coder,<br />à ton rythme.
                    </h1>
                    <p className='text-base text-white/90 leading-relaxed'>
                        Crow Educ propose des cours structurés, des quiz et des certificats
                        pour transformer ta curiosité en vraies compétences.
                    </p>
                </div>

                <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2'>
                    <Button asChild size="lg" className="gap-2">
                        <Link to="/courses">
                            <BookOpen className="h-4 w-4" /> Découvrir les cours
                        </Link>
                    </Button>
                    {!isAuthenticated && (
                        <Button asChild size="lg" variant="secondary" className="gap-2">
                            <Link to="/register">
                                Créer un compte gratuit <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default LandingPage;
