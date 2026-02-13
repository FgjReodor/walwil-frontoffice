'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/priority-badge';
import { StatusBadge } from '@/components/status-badge';
import { SendEmailForm } from '@/components/send-email-form';
import { VehicleTable } from '@/components/vehicle-table';
import { ChargesTable } from '@/components/charges-table';
import { EmailThread } from '@/components/email-thread';
import { fetchShipmentDetail, generateShipmentCsv, updateShipmentData } from '@/app/shipments/actions/shipments';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  calculatePriority,
  deriveStatus,
  getPriorityStyles,
  parseMissingFields,
  parseVehiclesMissingWeight,
  parseAmbiguousFields,
} from '@/lib/priority';
import { Shipment, ShipmentDetail, Vehicle, ShipmentParty, PartyType, normalizePartyType } from '@/types/shipment';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  MailCheck,
  AlertCircle,
  AlertTriangle,
  Download,
  CheckCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { openShipmentPreview } from '@/lib/export-excel';

interface ShipmentCardProps {
  shipment: Shipment;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function ShipmentCard({ shipment, isExpanded, onToggleExpand }: ShipmentCardProps) {
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    vesselVoyage: '',
    polCode: '',
    podCode: '',
    notes: '',
  });
  const [editVehicles, setEditVehicles] = useState<Vehicle[]>([]);
  const [editParties, setEditParties] = useState<ShipmentParty[]>([]);
  const queryClient = useQueryClient();

  const priority = calculatePriority(shipment);
  const status = deriveStatus(shipment);
  const priorityStyles = getPriorityStyles(priority);

  // Fetch detail data when expanded
  const {
    data: detailResponse,
    isLoading: isLoadingDetail,
    isFetching: isFetchingDetail,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['shipment-detail', shipment.id],
    queryFn: () => fetchShipmentDetail(shipment.id),
    enabled: isExpanded, // Only fetch when expanded
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter to catch updates
  });

  const detail = detailResponse?.success ? detailResponse.data : null;
  const hasReplyReceived = shipment.replyReceived || detail?.replyReceived;

  // Use detail data if available, otherwise fall back to list data
  const rawMissingFields = parseMissingFields(detail?.missingFields || shipment.missingFields);
  const rawVehiclesMissingWeight = parseVehiclesMissingWeight(detail?.vehiclesMissingWeight || shipment.vehiclesMissingWeight);
  const ambiguousFields = parseAmbiguousFields(detail?.ambiguousFields || shipment.ambiguousFields);

  // Check if vehicles actually have all weights (backend may not have cleared the flags)
  const allVehiclesHaveWeight = detail?.vehicles
    ? detail.vehicles.every(v => v.weightKg !== null && v.weightKg > 0)
    : false;

  // Filter vehiclesMissingWeight to only include VINs that actually still lack weight
  const vehiclesMissingWeight = allVehiclesHaveWeight
    ? []
    : detail?.vehicles
      ? rawVehiclesMissingWeight.filter(vin => {
          const vehicle = detail.vehicles.find(v => v.vin === vin);
          return !vehicle || vehicle.weightKg === null || vehicle.weightKg === 0;
        })
      : rawVehiclesMissingWeight;

  // Filter out fields that are no longer actually missing:
  // - Vehicle weight related: Always filter out - we show specific VINs via vehiclesMissingWeight instead
  // - port_of_loading: Always filter out - POL data comes from WWO Worksheets, not SI documents
  // - vessel: Filter out if vesselVoyage is now populated
  const effectiveVessel = detail?.vesselVoyage || shipment.vesselVoyage;
  const effectivePOL = detail?.polCode || shipment.polCode || detail?.departureFrom || shipment.departureFrom;
  const effectivePOD = detail?.podCode || shipment.podCode || detail?.portOfDestination || shipment.portOfDestination;
  const missingFields = rawMissingFields.filter(field => {
    const lowerField = field.toLowerCase();
    // Always filter out vehicle weight entries - we show specific VINs via vehiclesMissingWeight card
    if (lowerField.includes('vehicle') && lowerField.includes('weight')) {
      return false;
    }
    // Always filter out port_of_loading - POL Code comes from WWO Worksheets, not SI
    if (lowerField.includes('port') && lowerField.includes('loading')) {
      return false;
    }
    // Filter out vessel if it's now populated
    if (lowerField === 'vessel' && effectiveVessel) {
      return false;
    }
    // Filter out port_of_destination if it's now populated
    if (lowerField.includes('destination') && effectivePOD) {
      return false;
    }
    return true;
  });

  // Determine if there are actual remaining issues based on filtered fields
  // Don't rely solely on hasMissingData as it may be stale after customer provides info
  const hasIssues = missingFields.length > 0 || vehiclesMissingWeight.length > 0;

  // Generate issue description for collapsed view
  const getIssueDescription = () => {
    if (!hasIssues) {
      return 'Documentation complete - ready for CSV generation';
    }

    // Show specific issues from filtered missingFields and vehiclesMissingWeight
    const issues: string[] = [];
    missingFields.forEach(field => {
      issues.push(formatFieldName(field));
    });
    if (vehiclesMissingWeight.length > 0) {
      issues.push(`${vehiclesMissingWeight.length} vehicle(s) missing weight`);
    }

    if (issues.length > 0) {
      return `Issues: ${issues.join(', ')}`;
    }

    // Fallback (shouldn't reach here if hasIssues is true)
    return 'Has issues requiring attention - expand for details';
  };

  const handleGenerateCsv = async () => {
    setIsGeneratingCsv(true);
    setCsvResult(null);
    try {
      const result = await generateShipmentCsv(shipment.id);
      if (result.success) {
        setCsvResult(result.data);
        toast.success('CSV generated successfully', {
          description: result.data.fileName,
        });
      } else {
        toast.error('Failed to generate CSV', {
          description: result.message || 'Please try again',
        });
      }
    } catch (error) {
      toast.error('Failed to generate CSV', {
        description: 'Please try again later',
      });
    } finally {
      setIsGeneratingCsv(false);
    }
  };

  const handleRefresh = async () => {
    await refetchDetail();
    // Also invalidate the list to pick up any status changes
    queryClient.invalidateQueries({ queryKey: ['shipments'] });
    toast.success('Data refreshed');
  };

  const handleEnterEditMode = () => {
    // Initialize form data with current values
    // Use polCode/podCode with fallback to legacy departureFrom/portOfDestination
    setEditFormData({
      vesselVoyage: detail?.vesselVoyage || shipment.vesselVoyage || '',
      polCode: detail?.polCode || shipment.polCode || detail?.departureFrom || shipment.departureFrom || '',
      podCode: detail?.podCode || shipment.podCode || detail?.portOfDestination || shipment.portOfDestination || '',
      notes: detail?.notes || shipment.notes || '',
    });
    // Initialize vehicles with current values (deep copy)
    setEditVehicles(detail?.vehicles ? detail.vehicles.map(v => ({ ...v })) : []);
    // Initialize parties with current values (deep copy), or create empty ones if none exist
    // Normalize partyType from numeric Dataverse values to string
    const existingParties = detail?.parties || shipment.parties || [];
    const partyTypes: PartyType[] = ['SHIP', 'CONS', 'NOT'];
    const parties = partyTypes.map(type => {
      const existing = existingParties.find(p => normalizePartyType(p.partyType) === type);
      if (existing) {
        return { ...existing, partyType: normalizePartyType(existing.partyType) };
      }
      // Create empty party if none exists
      return {
        id: `new-${type}`,
        partyType: type,
        nameLine1: '',
        nameLine2: '',
        addressLine1: '',
        addressLine2: '',
        addressLine3: '',
        city: '',
        country: '',
        postalCode: '',
      } as ShipmentParty;
    });
    setEditParties(parties);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const result = await updateShipmentData(shipment.id, {
        ...editFormData,
        vehicles: editVehicles,
        parties: editParties,
      });
      if (result.success) {
        toast.success('Shipment updated successfully');
        setIsEditMode(false);
        // Refresh data to show updated values
        await refetchDetail();
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
      } else {
        toast.error('Failed to update shipment', {
          description: result.message || 'Please try again',
        });
      }
    } catch (error) {
      toast.error('Failed to update shipment', {
        description: 'Please try again later',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4 transition-shadow hover:shadow-md',
        priorityStyles.cardBorder
      )}
    >
      {/* Collapsed Header */}
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          <PriorityBadge priority={priority} />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{shipment.manufacturer}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{shipment.vesselVoyage || shipment.blNumber}</span>
            {hasReplyReceived && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                <MailCheck className="h-3 w-3" />
                Reply
              </span>
            )}
            {status === 'urgent' && <StatusBadge status="urgent" />}
            {status === 'awaiting_customer' && !hasReplyReceived && <StatusBadge status="awaiting_customer" />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {shipment.xlsxFileUrl && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                window.open(shipment.xlsxFileUrl, '_blank');
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              XLSX
            </Button>
          )}
          {shipment.siFileUrl && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                window.open(shipment.siFileUrl, '_blank');
              }}
            >
              <FileText className="mr-1.5 h-4 w-4" />
              View SI
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Issue Summary (always visible) */}
      <div className={cn(
        'border-t px-4 py-2',
        hasIssues ? 'bg-orange-50/50 border-orange-100' : 'bg-green-50/50 border-green-100'
      )}>
        <p className={cn(
          'text-sm',
          hasIssues ? 'text-orange-700' : 'text-green-700'
        )}>
          {!hasIssues && <CheckCircle className="inline h-4 w-4 mr-1 -mt-0.5" />}
          {hasIssues && <AlertCircle className="inline h-4 w-4 mr-1 -mt-0.5" />}
          {getIssueDescription()}
        </p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-4 space-y-4">
          {/* Loading state */}
          {isLoadingDetail && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading details...</span>
            </div>
          )}

          {!isLoadingDetail && (
            <>
              {/* Header with edit/refresh buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">BL: {shipment.blNumber}</span>
                  {shipment.status && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {shipment.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isEditMode ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="text-gray-500"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEnterEditMode}
                        className="text-gray-500"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isFetchingDetail}
                        className="text-gray-500"
                      >
                        <RefreshCw className={cn("h-4 w-4", isFetchingDetail && "animate-spin")} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Source Email / Edit Form Section */}
              {isEditMode ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Pencil className="h-4 w-4" />
                    <span className="font-medium">Edit Shipment Details</span>
                  </div>

                  {/* Editable Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Vessel / Voyage
                      </label>
                      <Input
                        value={editFormData.vesselVoyage}
                        onChange={(e) => setEditFormData({ ...editFormData, vesselVoyage: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        POL
                      </label>
                      <Input
                        value={editFormData.polCode}
                        onChange={(e) => setEditFormData({ ...editFormData, polCode: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        POD
                      </label>
                      <Input
                        value={editFormData.podCode}
                        onChange={(e) => setEditFormData({ ...editFormData, podCode: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  {/* Party Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {editParties.map((party, index) => (
                      <PartyEditor
                        key={party.partyType}
                        party={party}
                        onChange={(updated) => {
                          const newParties = [...editParties];
                          newParties[index] = updated;
                          setEditParties(newParties);
                        }}
                      />
                    ))}
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Notes
                    </label>
                    <Textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      rows={2}
                      className="bg-white resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Source Email</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {detail?.xlsxFileUrl && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-green-600 p-0 h-auto"
                          onClick={() => window.open(detail.xlsxFileUrl, '_blank')}
                        >
                          Generated XLSX <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                      {detail?.siFileUrl && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-blue-600 p-0 h-auto"
                          onClick={() => window.open(detail.siFileUrl, '_blank')}
                        >
                          View Attachment <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {detail?.senderEmail || shipment.senderEmail || 'Unknown sender'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(shipment.receivedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Shipping Instructions {shipment.blNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      Route: {effectivePOL || 'N/A'} → {effectivePOD || 'N/A'}
                      {(detail?.vesselVoyage || shipment.vesselVoyage) &&
                        ` • Vessel: ${detail?.vesselVoyage || shipment.vesselVoyage}`
                      }
                      {shipment.totalUnits && ` • ${shipment.totalUnits} units`}
                    </p>
                  </div>

                  {/* Display Notes if present */}
                  {(detail?.notes || shipment.notes) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</span>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                        {detail?.notes || shipment.notes}
                      </p>
                    </div>
                  )}

                  {/* Display Parties */}
                  <PartyDisplay parties={detail?.parties || shipment.parties || []} />
                </div>
              )}

              {/* Issue Cards - Only show if there are issues */}
              {hasIssues && (missingFields.length > 0 || vehiclesMissingWeight.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Issues Requiring Action</h3>
                  {missingFields.map((field, index) => (
                    <IssueCard
                      key={index}
                      title={formatFieldName(field)}
                      source="From: Attachment"
                      description={getFieldDescription(field)}
                      status={status}
                    />
                  ))}
                  {vehiclesMissingWeight.length > 0 && (
                    <IssueCard
                      title="Vehicle Weight Missing"
                      source="From: Attachment"
                      description={`Weight data missing for ${vehiclesMissingWeight.length} vehicle(s)`}
                      value={vehiclesMissingWeight.slice(0, 3).join(', ') + (vehiclesMissingWeight.length > 3 ? '...' : '')}
                      status={status}
                    />
                  )}
                </div>
              )}

              {/* Ambiguous Fields - Show data that needs verification (yellow/amber styling) */}
              {ambiguousFields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Data Requiring Verification</h3>
                  {ambiguousFields.map((item, index) => (
                    <AmbiguousFieldCard
                      key={index}
                      field={formatFieldName(item.field)}
                      reason={item.reason}
                    />
                  ))}
                </div>
              )}

              {/* Vehicle Table */}
              {detail?.vehicles && detail.vehicles.length > 0 && (
                <VehicleTable
                  vehicles={isEditMode ? editVehicles : detail.vehicles}
                  isEditMode={isEditMode}
                  onVehiclesChange={setEditVehicles}
                />
              )}

              {/* Charges Table */}
              <ChargesTable charges={detail?.charges ?? []} />

              {/* Email Thread */}
              <EmailThread
                shipmentId={shipment.id}
                hasReplies={hasReplyReceived}
                shipment={{ ...shipment, ...detail } as Shipment}
              />

              {/* Actions Section */}
              {hasIssues ? (
                // Show email form for items with issues
                <SendEmailForm
                  toEmail={detail?.senderEmail || shipment.senderEmail || ''}
                  shipment={{ ...shipment, ...detail } as Shipment}
                />
              ) : (
                // Show Generate CSV for ready items
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Ready for Processing</p>
                        <p className="text-sm text-green-600">All documentation complete</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {detail && (
                        <Button
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                          onClick={() => openShipmentPreview(detail)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      )}
                      {csvResult ? (
                        <Button
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() => window.open(csvResult.fileUrl, '_blank')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download {csvResult.fileName}
                        </Button>
                      ) : (
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={handleGenerateCsv}
                          disabled={isGeneratingCsv}
                        >
                          {isGeneratingCsv ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Generate CSV
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// Issue Card Component
interface IssueCardProps {
  title: string;
  source: string;
  description: string;
  value?: string;
  status: ReturnType<typeof deriveStatus>;
}

function IssueCard({ title, source, description, value, status }: IssueCardProps) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{title}</span>
              <span className="text-sm text-gray-500">{source}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
            {value && (
              <p className="text-sm text-gray-500 mt-1">
                VINs: <span className="font-mono bg-white px-1 rounded text-xs">{value}</span>
              </p>
            )}
          </div>
        </div>
        <StatusBadge status="awaiting_customer" />
      </div>
    </div>
  );
}

// Ambiguous Field Card Component - amber/yellow styling for verification
interface AmbiguousFieldCardProps {
  field: string;
  reason: string;
}

function AmbiguousFieldCard({ field, reason }: AmbiguousFieldCardProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <span className="font-medium text-gray-900">{field}</span>
          <p className="text-sm text-amber-700 mt-1">{reason}</p>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    container_number: 'Container Number Invalid',
    duplicate_vin: 'Duplicate VIN Detected',
    hs_code: 'Missing HS Code',
    vehicle_weight: 'Missing Vehicle Weight',
    port_of_destination: 'Missing Destination Port',
    port_of_loading: 'Missing Port of Loading',
    departure_from: 'Missing Departure Location',
    vessel_voyage: 'Missing Vessel/Voyage',
    consignee: 'Missing Consignee Info',
    shipper: 'Missing Shipper Info',
  };
  return names[field.toLowerCase()] || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getFieldDescription(field: string): string {
  const descriptions: Record<string, string> = {
    container_number: 'Container number does not match ISO 6346 format',
    duplicate_vin: 'Same VIN appears multiple times in the shipment',
    hs_code: 'HS codes required for customs declaration',
    vehicle_weight: 'Weight required for shipping calculations',
    port_of_destination: 'Destination port is required',
    port_of_loading: 'Port of loading is required for documentation',
    departure_from: 'Departure location is required',
    vessel_voyage: 'Vessel and voyage information required',
    consignee: 'Consignee details are incomplete',
    shipper: 'Shipper details are incomplete',
  };
  return descriptions[field.toLowerCase()] || 'This field requires correction or additional information';
}

function getPartyTypeLabel(type: PartyType): string {
  const labels: Record<PartyType, string> = {
    SHIP: 'Shipper',
    CONS: 'Consignee',
    NOT: 'Notify Party',
  };
  return labels[type];
}

// Format party for display - returns empty string if no data
function formatPartyDisplay(party: ShipmentParty): string {
  const lines = [
    party.nameLine1,
    party.nameLine2,
    party.addressLine1,
    party.addressLine2,
    party.addressLine3,
    [party.city, party.postalCode].filter(Boolean).join(' '),
    party.country,
  ].filter(Boolean);
  return lines.join('\n');
}

// Party Editor Component
interface PartyEditorProps {
  party: ShipmentParty;
  onChange: (party: ShipmentParty) => void;
}

function PartyEditor({ party, onChange }: PartyEditorProps) {
  const updateField = (field: keyof ShipmentParty, value: string) => {
    onChange({ ...party, [field]: value });
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
        {getPartyTypeLabel(party.partyType)}
      </label>
      <Input
        value={party.nameLine1 || ''}
        onChange={(e) => updateField('nameLine1', e.target.value)}
        placeholder="Name"
        className="bg-white h-8 text-sm"
      />
      <Input
        value={party.nameLine2 || ''}
        onChange={(e) => updateField('nameLine2', e.target.value)}
        placeholder="Name Line 2"
        className="bg-white h-8 text-sm"
      />
      <Input
        value={party.addressLine1 || ''}
        onChange={(e) => updateField('addressLine1', e.target.value)}
        placeholder="Address Line 1"
        className="bg-white h-8 text-sm"
      />
      <Input
        value={party.addressLine2 || ''}
        onChange={(e) => updateField('addressLine2', e.target.value)}
        placeholder="Address Line 2"
        className="bg-white h-8 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={party.city || ''}
          onChange={(e) => updateField('city', e.target.value)}
          placeholder="City"
          className="bg-white h-8 text-sm"
        />
        <Input
          value={party.postalCode || ''}
          onChange={(e) => updateField('postalCode', e.target.value)}
          placeholder="Postal Code"
          className="bg-white h-8 text-sm"
        />
      </div>
      <Input
        value={party.country || ''}
        onChange={(e) => updateField('country', e.target.value)}
        placeholder="Country"
        className="bg-white h-8 text-sm"
      />
    </div>
  );
}

// Party Display Component (for view mode)
interface PartyDisplayProps {
  parties: ShipmentParty[];
}

function PartyDisplay({ parties }: PartyDisplayProps) {
  if (!parties || parties.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100">
      {(['SHIP', 'CONS', 'NOT'] as PartyType[]).map((type) => {
        const party = parties.find(p => normalizePartyType(p.partyType) === type);
        const displayText = party ? formatPartyDisplay(party) : null;

        if (!party || !displayText) return (
          <div key={type}>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {getPartyTypeLabel(type)}
            </span>
            <p className="text-sm text-gray-400 mt-1">Not specified</p>
          </div>
        );
        return (
          <div key={type}>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {getPartyTypeLabel(type)}
            </span>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
              {displayText}
            </p>
          </div>
        );
      })}
    </div>
  );
}
