import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Container,
    Card,
    CardContent,
    Stack,
    TextField,
    Button,
    Tooltip,
    IconButton,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';

import { getAllAttendanceApi, deleteAttendanceApi } from '../api/adminAttendanceApi';
import { format } from 'date-fns';

// Iconos
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'dd/MM/yyyy');
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'HH:mm:ss');
};

export default function AdminAttendancePage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [queryOptions, setQueryOptions] = useState({});

    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                ...queryOptions,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
            };
            const { data } = await getAllAttendanceApi(params);
            setRows(data.items || []);
            setRowCount(data.total || 0);
        } catch (error) {
            console.error("Error al cargar las asistencias:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [paginationModel, queryOptions]);

    const handleFilterSubmit = () => {
        // Al aplicar filtros, volvemos a la primera página
        setPaginationModel(prev => ({ ...prev, page: 0 }));
        fetchData();
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            try {
                await deleteAttendanceApi(id);
                fetchData(); // Recargar datos
            } catch (error) {
                console.error("Error al eliminar el registro:", error);
            }
        }
    };

    const columns = [
        { 
            field: 'nombre', 
            headerName: 'Nombre', 
            flex: 1, 
            valueGetter: (params) => {
                if (!params || !params.row || !params.row.user) {
                    return '';
                }
                const user = params.row.user; // Ahora sabemos que params.row.user existe
                return `${user.nombre || ''} ${user.apellido || ''}`.trim();
            }
        },
        { field: 'clockInDate', headerName: 'Fecha Entrada', width: 120, valueGetter: (params) => {
            if (!params || !params.row) return '';
            return formatDate(params.row.clockInTime);
        }},
        { field: 'clockInTime', headerName: 'Hora Entrada', width: 120, valueGetter: (params) => {
            if (!params || !params.row) return '';
            return formatTime(params.row.clockInTime);
        }},
        { field: 'clockOutTime', headerName: 'Hora Salida', width: 120, valueGetter: (params) => {
            if (!params || !params.row) return '';
            return formatTime(params.row.clockOutTime);
        }},
        { field: 'status', headerName: 'Estado', width: 110, renderCell: (params) => <Typography color={params.value === 'completed' ? 'success.main' : 'warning.main'}>{params.value}</Typography> },
        { field: 'notes', headerName: 'Notas', flex: 1.5 },
        {
            field: 'actions',
            headerName: 'Acciones',
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => alert(`Editar ${params.id}`)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(params.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={700}>Gestión de Asistencias</Typography>
                <Tooltip title="Actualizar Datos">
                    <span>
                        <IconButton onClick={fetchData} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Filtros</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                        <TextField
                            label="Desde"
                            type="date"
                            size="small"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Hasta"
                            type="date"
                            size="small"
                            value={filters.dateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                        <Button variant="contained" onClick={handleFilterSubmit} disabled={loading}>
                            Aplicar Filtros
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            <Card>
                <Box sx={{ height: 650, width: '100%' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        loading={loading}
                        rowCount={rowCount}
                        pageSizeOptions={[5, 10, 20]}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        paginationMode="server"
                        sortingMode="server"
                        onSortModelChange={(model) => {
                            const sort = model[0];
                            setQueryOptions(sort ? { sortBy: sort.field, sortDir: sort.sort } : {});
                        }}
                        getRowId={(row) => row._id}
                        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
                        slots={{
                            toolbar: GridToolbar,
                        }}
                        sx={{
                            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                                outline: 'none !important',
                            },
                            border: 0,
                        }}
                    />
                </Box>
            </Card>
        </Container>
    );
}