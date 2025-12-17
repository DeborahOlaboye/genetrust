import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Paper,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Info as InfoIcon,
  Visibility as ViewIcon,
  HistoryEdu as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const DataVersionHistory = ({
  dataId,
  versionHistory = [],
  loading = false,
  error = null,
  onFetchVersionHistory,
  enableDetailView = true,
}) => {
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (onFetchVersionHistory && dataId) {
      onFetchVersionHistory(dataId);
    }
  }, [dataId, onFetchVersionHistory]);

  const handleViewVersion = (version) => {
    setSelectedVersion(version);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVersion(null);
  };

  const formatTimestamp = (blockHeight) => {
    const blocksPerMinute = 0.16;
    const minutes = Math.floor(blockHeight / blocksPerMinute);
    const days = Math.floor(minutes / 1440);
    
    if (days > 0) {
      return `${days} days, ${minutes % 1440} minutes ago`;
    }
    return `${minutes} minutes ago`;
  };

  if (error) {
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert severity="error">
          Failed to load version history: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader
          avatar={<HistoryIcon />}
          title="Dataset Version History"
          subheader={`Dataset ID: ${dataId} | Total Versions: ${versionHistory.length}`}
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : versionHistory.length === 0 ? (
            <Alert severity="info" icon={<InfoIcon />}>
              No version history found for this dataset
            </Alert>
          ) : (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {versionHistory.map((version, index) => (
                      <Paper
                        key={`${version.version}-${index}`}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': { boxShadow: 2 },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={2}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                              <Chip
                                label={`v${version.version}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={7}>
                            <Typography variant="subtitle2" gutterBottom>
                              Version {version.version}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Block: {version.blockHeight}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              {formatTimestamp(version.blockHeight)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Price:</strong> {version.price}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Access Level:</strong> {version.accessLevel}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Status:</strong> {version.isActive ? 'Active' : 'Inactive'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            {enableDetailView && (
                              <Button
                                fullWidth
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => handleViewVersion(version)}
                                variant="outlined"
                              >
                                View Details
                              </Button>
                            )}
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      Version Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Total Versions
                        </Typography>
                        <Typography variant="h5">{versionHistory.length}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Latest Version
                        </Typography>
                        <Typography variant="h5">
                          {versionHistory[versionHistory.length - 1]?.version || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          First Created At
                        </Typography>
                        <Typography variant="body2">
                          Block {versionHistory[0]?.blockHeight || 'Unknown'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Last Updated At
                        </Typography>
                        <Typography variant="body2">
                          Block {versionHistory[versionHistory.length - 1]?.blockHeight || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 3 }}>
                Version history is automatically tracked on the blockchain. Each version represents 
                a state snapshot of the dataset at a specific block height, enabling historical audits 
                and compliance verification.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Version Details - v{selectedVersion?.version}</DialogTitle>
        <DialogContent dividers>
          {selectedVersion && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Basic Information
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '40%' }}>Version Number</TableCell>
                      <TableCell>{selectedVersion.version}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Block Height</TableCell>
                      <TableCell>{selectedVersion.blockHeight}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                      <TableCell>{selectedVersion.createdAt}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Updated At</TableCell>
                      <TableCell>{selectedVersion.updatedAt}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Ownership & Pricing
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '40%' }}>Owner</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedVersion.owner || 'Unknown'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                      <TableCell>{selectedVersion.price}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Access & Status
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '40%' }}>Access Level</TableCell>
                      <TableCell>
                        <Chip label={`Level ${selectedVersion.accessLevel}`} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell>
                        <Chip
                          label={selectedVersion.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={selectedVersion.isActive ? 'success' : 'default'}
                          variant="filled"
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Data & Metadata
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: '40%' }}>Description</TableCell>
                      <TableCell>{selectedVersion.description || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Metadata Hash</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedVersion.metadataHash || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Storage URL</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {selectedVersion.encryptedStorageUrl || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>

              <Alert severity="info" icon={<InfoIcon />}>
                This version snapshot is immutable on the blockchain and can be used for historical audits, 
                compliance verification, and data provenance tracking.
              </Alert>
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

DataVersionHistory.propTypes = {
  dataId: PropTypes.number.isRequired,
  versionHistory: PropTypes.arrayOf(
    PropTypes.shape({
      version: PropTypes.number,
      blockHeight: PropTypes.number,
      owner: PropTypes.string,
      price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      accessLevel: PropTypes.number,
      metadataHash: PropTypes.string,
      encryptedStorageUrl: PropTypes.string,
      description: PropTypes.string,
      createdAt: PropTypes.number,
      updatedAt: PropTypes.number,
      isActive: PropTypes.bool,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onFetchVersionHistory: PropTypes.func,
  enableDetailView: PropTypes.bool,
};

export default DataVersionHistory;
