import React from 'react';
import { Dialog, DialogContent, Box, Typography, IconButton, CircularProgress, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function FilePreviewModal({ open, onClose, fileUrl, fileType, fileName, loading }) {
  const isImage = fileType?.startsWith('image/') || fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = fileType === 'application/pdf' || fileName?.match(/\.pdf$/i);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth 
      PaperProps={{ sx: { height: '85vh', display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'bold' }}>
          {fileName || 'Vista Previa'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      <DialogContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            {isImage && fileUrl && (
              <Box component="img" src={fileUrl} alt={fileName} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', p: 2 }} />
            )}
            {isPdf && fileUrl && (
              <iframe src={fileUrl} title={fileName} width="100%" height="100%" style={{ border: 'none' }} />
            )}
            {!isImage && !isPdf && fileUrl && (
               <Box p={3} textAlign="center">
                 <Typography variant="h6" gutterBottom>Vista previa no disponible.</Typography>
                 <Button variant="contained" href={fileUrl} download={fileName} target="_blank">Descargar Archivo</Button>
               </Box>
            )}
            {!fileUrl && !loading && <Typography color="error">No se pudo cargar el archivo.</Typography>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}