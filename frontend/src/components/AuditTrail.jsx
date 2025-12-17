import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

const AuditTrail = ({
  dataId,
  auditEntries = [],
  loading = false,
  error = null,
  onFetchAuditTrail,
  onExportAuditTrail,
  enableFiltering = true,
  enableExport = true,
  pageSize = 10,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStartBlock, setFilterStartBlock] = useState('');
  const [filterEndBlock, setFilterEndBlock] = useState('');

  useEffect(() => {
    if (onFetchAuditTrail && dataId) {
      onFetchAuditTrail(dataId);
    }
  }, [dataId, onFetchAuditTrail]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (entry) => {
    setSelectedEntry(entry);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEntry(null);
  };

  const handleExport = () => {
    if (onExportAuditTrail) {
      onExportAuditTrail(filteredEntries);
    }
  };

  const filteredEntries = auditEntries.filter((entry) => {
    if (filterType !== 'all' && entry.action !== filterType) {
      return false;
    }
    if (filterStartBlock && entry.blockHeight < parseInt(filterStartBlock)) {
      return false;
    }
    if (filterEndBlock && entry.blockHeight > parseInt(filterEndBlock)) {
      return false;
    }
    return true;
  });

  const paginatedEntries = filteredEntries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getActionColor = (action) => {
    const colors = {
      access: 'primary',
      grant: 'success',
      revoke: 'error',
      update: 'warning',
      consent: 'info',
    };
    return colors[action] || 'default';
  };

  const formatTimestamp = (blockHeight) => {
    const blocksPerMinute = 0.16;
    const minutes = Math.floor(blockHeight / blocksPerMinute);
    const days = Math.floor(minutes / 1440);
    
    if (days > 0) {
      return `${days}d ${minutes % 1440}m ago`;
    }
    return `${minutes}m ago`;
  };

  if (error) {
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert severity="error">
          Failed to load audit trail: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader
          avatar={<HistoryIcon />}
          title="Audit Trail & History"
          subheader={`Dataset ID: ${dataId} | Total Records: ${filteredEntries.length}`}
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          {enableFiltering && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Action Type</InputLabel>
                    <Select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      label="Action Type"
                    >
                      <MenuItem value="all">All Actions</MenuItem>
                      <MenuItem value="access">Access</MenuItem>
                      <MenuItem value="grant">Grant</MenuItem>
                      <MenuItem value="revoke">Revoke</MenuItem>
                      <MenuItem value="update">Update</MenuItem>
                      <MenuItem value="consent">Consent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Start Block"
                    type="number"
                    value={filterStartBlock}
                    onChange={(e) => setFilterStartBlock(e.target.value)}
                    placeholder="Block height"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="End Block"
                    type="number"
                    value={filterEndBlock}
                    onChange={(e) => setFilterEndBlock(e.target.value)}
                    placeholder="Block height"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : auditEntries.length === 0 ? (
            <Alert severity="info" icon={<InfoIcon />}>
              No audit trail entries found for this dataset
            </Alert>
          ) : (
            <Box>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Block Height
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Timestamp
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Action
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        User
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Purpose
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Access Level
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedEntries.map((entry, idx) => (
                      <TableRow
                        key={`${entry.blockHeight}-${idx}`}
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:last-child td, &:last-child th': { border: 0 },
                        }}
                      >
                        <TableCell>
                          <Chip
                            label={entry.blockHeight}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {formatTimestamp(entry.blockHeight)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.action}
                            size="small"
                            color={getActionColor(entry.action)}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {entry.user?.substring(0, 10)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {entry.purpose || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`Level ${entry.accessLevel || 0}`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handleViewDetails(entry)}
                            sx={{ textTransform: 'none' }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 2,
                }}
              >
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredEntries.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
                {enableExport && (
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    variant="outlined"
                    sx={{ ml: 2 }}
                  >
                    Export Audit Trail
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Audit Trail Entry Details</DialogTitle>
        <DialogContent dividers>
          {selectedEntry && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Block Height
                </Typography>
                <Typography variant="body2">{selectedEntry.blockHeight}</Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Action
                </Typography>
                <Chip label={selectedEntry.action} color={getActionColor(selectedEntry.action)} />
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  User Principal
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedEntry.user}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Transaction ID
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedEntry.txId || 'N/A'}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Purpose
                </Typography>
                <Typography variant="body2">{selectedEntry.purpose || 'N/A'}</Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Access Level
                </Typography>
                <Typography variant="body2">Level {selectedEntry.accessLevel || 0}</Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Approved By
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedEntry.approvedBy || 'N/A'}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                <Typography variant="caption" color="textSecondary">
                  This entry is part of the blockchain audit trail for compliance with GDPR Article 30 
                  and other regulatory requirements.
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

AuditTrail.propTypes = {
  dataId: PropTypes.number.isRequired,
  auditEntries: PropTypes.arrayOf(
    PropTypes.shape({
      blockHeight: PropTypes.number,
      action: PropTypes.string,
      user: PropTypes.string,
      purpose: PropTypes.string,
      accessLevel: PropTypes.number,
      txId: PropTypes.string,
      approvedBy: PropTypes.string,
      timestamp: PropTypes.number,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onFetchAuditTrail: PropTypes.func,
  onExportAuditTrail: PropTypes.func,
  enableFiltering: PropTypes.bool,
  enableExport: PropTypes.bool,
  pageSize: PropTypes.number,
};

export default AuditTrail;
