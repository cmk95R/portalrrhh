import React from 'react';
import { Container, Box } from '@mui/material';
import AssistanceWidget from '../components/Assistance';

export default function AttendancePage() {
    return (
        <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
            <Box>
                <AssistanceWidget />
            </Box>
        </Container>
    );
}

