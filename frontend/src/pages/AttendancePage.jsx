import React from 'react';
import { Container, Box } from '@mui/material';
import AssistanceWidget from '../components/Assistance';
import Footer from '../components/footer';

export default function AttendancePage() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 }, flexGrow: 1 }}>
                <Box>
                    <AssistanceWidget />
                </Box>
            </Container>
            <Footer />
        </Box>
    );
}