import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  HighlightOff as HighlightOffIcon,
  Info as InfoIcon,
  Gavel as ComplianceIcon,
  AssignmentTurnedIn as VerifiedIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';

const ComplianceReport = ({
  dataId,
  complianceData = {},
  loading = false,
  error = null,
  onFetchCompliance,
  onExportReport,
  enableExport = true,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);

  useEffect(() => {
    if (onFetchCompliance && dataId) {
      onFetchCompliance(dataId);
    }
  }, [dataId, onFetchCompliance]);

  const handleViewCheckpoint = (checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCheckpoint(null);
  };

  const handleExport = () => {
    if (onExportReport) {
      onExportReport(complianceData);
    }
  };

  const complianceCheckpoints = [
    {
      id: 'audit_trail',
      name: 'Audit Trail',
      description: 'Complete audit trail for data access',
      requirement: 'GDPR Article 32(1)(b)',
      status: complianceData?.hasAuditTrail ? 'compliant' : 'pending',
      details: `${complianceData?.auditEntries || 0} audit trail entries recorded`,
    },
    {
      id: 'consent_tracking',
      name: 'Consent Management',
      description: 'Proper consent tracking and management',
      requirement: 'GDPR Article 7',
      status: complianceData?.consentTracked ? 'compliant' : 'pending',
      details: `${complianceData?.consentChanges || 0} consent changes tracked`,
    },
    {
      id: 'data_protection',
      name: 'Data Protection',
      description: 'Data protection measures implemented',
      requirement: 'GDPR Article 32',
      status: complianceData?.dataProtected ? 'compliant' : 'pending',
      details: 'Encrypted storage and access controls in place',
    },
    {
      id: 'gdpr_article_30',
      name: 'Article 30 Compliance',
      description: 'Records of processing activities',
      requirement: 'GDPR Article 30',
      status: complianceData?.gdprCompliant ? 'compliant' : 'non-compliant',
      details: `Jurisdiction: ${complianceData?.jurisdiction || 'Unknown'}`,
    },
    {
      id: 'right_to_be_forgotten',
      name: 'Right to be Forgotten',
      description: 'Erasure request capability',
      requirement: 'GDPR Article 17',
      status: complianceData?.erasureCapable ? 'compliant' : 'pending',
      details: 'Erasure workflow available',
    },
    {
      id: 'data_portability',
      name: 'Data Portability',
      description: 'Data portability support',
      requirement: 'GDPR Article 20',
      status: complianceData?.portabilitySupported ? 'compliant' : 'pending',
      details: 'Data export functionality available',
    },
  ];

  const complianceScore = complianceCheckpoints.filter(
    (cp) => cp.status === 'compliant'
  ).length / complianceCheckpoints.length * 100;

  const getStatusColor = (status) => {
    const colors = {
      compliant: 'success',
      pending: 'warning',
      'non-compliant': 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      compliant: <CheckCircleIcon />,
      pending: <InfoIcon />,
      'non-compliant': <HighlightOffIcon />,
    };
    return icons[status] || <InfoIcon />;
  };

  if (error) {
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert severity="error">
          Failed to load compliance report: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader
          avatar={<ComplianceIcon />}
          title="Regulatory Compliance Report"
          subheader={`Dataset ID: ${dataId} | GDPR & Regulatory Compliance`}
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'primary.light' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom>
                      Overall Compliance Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={complianceScore}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Typography variant="h6" sx={{ minWidth: 50 }}>
                        {Math.round(complianceScore)}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Compliance Status
                    </Typography>
                    <Chip
                      icon={<VerifiedIcon />}
                      label={complianceScore >= 80 ? 'Highly Compliant' : 'Needs Attention'}
                      color={complianceScore >= 80 ? 'success' : 'warning'}
                      variant="filled"
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Compliance Checkpoints
              </Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Checkpoint
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Requirement
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">
                        Details
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {complianceCheckpoints.map((checkpoint) => (
                      <TableRow
                        key={checkpoint.id}
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:last-child td, &:last-child th': { border: 0 },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {checkpoint.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {checkpoint.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={checkpoint.requirement}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(checkpoint.status)}
                            label={checkpoint.status}
                            size="small"
                            color={getStatusColor(checkpoint.status)}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={() => handleViewCheckpoint(checkpoint)}
                            sx={{ textTransform: 'none' }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert severity="info" icon={<InfoIcon />}>
                This compliance report is based on smart contract audit trails and records of processing 
                activities. It supports GDPR Article 30 compliance and other regulatory requirements.
              </Alert>

              {enableExport && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    variant="outlined"
                  >
                    Export Report
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Compliance Checkpoint Details</DialogTitle>
        <DialogContent dividers>
          {selectedCheckpoint && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Checkpoint
                </Typography>
                <Typography variant="body2">{selectedCheckpoint.name}</Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Description
                </Typography>
                <Typography variant="body2">{selectedCheckpoint.description}</Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Regulatory Requirement
                </Typography>
                <Chip label={selectedCheckpoint.requirement} variant="outlined" />
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Current Status
                </Typography>
                <Chip
                  icon={getStatusIcon(selectedCheckpoint.status)}
                  label={selectedCheckpoint.status}
                  color={getStatusColor(selectedCheckpoint.status)}
                  variant="filled"
                />
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Details
                </Typography>
                <Typography variant="body2">{selectedCheckpoint.details}</Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                <Typography variant="caption" color="textSecondary">
                  This checkpoint is verified through blockchain audit trails and smart contract 
                  records of processing activities, ensuring regulatory compliance with GDPR and 
                  other data protection regulations.
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

ComplianceReport.propTypes = {
  dataId: PropTypes.number.isRequired,
  complianceData: PropTypes.shape({
    hasAuditTrail: PropTypes.bool,
    auditEntries: PropTypes.number,
    consentTracked: PropTypes.bool,
    consentChanges: PropTypes.number,
    dataProtected: PropTypes.bool,
    gdprCompliant: PropTypes.bool,
    jurisdiction: PropTypes.string,
    erasureCapable: PropTypes.bool,
    portabilitySupported: PropTypes.bool,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onFetchCompliance: PropTypes.func,
  onExportReport: PropTypes.func,
  enableExport: PropTypes.bool,
};

export default ComplianceReport;
