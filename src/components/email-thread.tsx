'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmailMessage, EmailThread as EmailThreadType, Shipment } from '@/types/shipment';
import {
  Mail,
  MailOpen,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  Paperclip,
  Loader2,
  MessageSquare,
  Reply,
  X,
  Send,
  CheckCircle,
} from 'lucide-react';
import { fetchEmailThread, sendShipmentEmail } from '@/app/shipments/actions/shipments';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { parseMissingFields, parseVehiclesMissingWeight } from '@/lib/priority';

/**
 * Strip HTML tags and convert to readable plain text
 */
function stripHtml(html: string): string {
  if (!html) return '';

  // Replace common HTML elements with text equivalents
  let text = html
    // Replace <br>, <br/>, <br /> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace </p>, </div>, </li> with newlines
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    // Replace <li> with bullet points
    .replace(/<li[^>]*>/gi, '• ')
    // Replace &nbsp; with space
    .replace(/&nbsp;/gi, ' ')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse multiple newlines into max 2
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim overall
    .trim();

  return text;
}

interface EmailThreadProps {
  shipmentId: string;
  hasReplies?: boolean;
  shipment?: Shipment;
}

export function EmailThread({ shipmentId, hasReplies, shipment }: EmailThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['email-thread', shipmentId],
    queryFn: () => fetchEmailThread(shipmentId),
    enabled: isExpanded,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const thread = response?.success ? response.data : null;
  const emailCount = thread?.emails?.length || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            hasReplies ? "bg-green-100" : "bg-gray-100"
          )}>
            {hasReplies ? (
              <MailOpen className="h-4 w-4 text-green-600" />
            ) : (
              <MessageSquare className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <div className="text-left">
            <span className="font-medium text-gray-900">Email Thread</span>
            {hasReplies && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Reply Received
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          {isExpanded && emailCount > 0 && (
            <span className="text-sm">{emailCount} message{emailCount !== 1 ? 's' : ''}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>

      {/* Thread Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading emails...</span>
            </div>
          )}

          {isError && (
            <div className="p-4 text-center text-sm text-gray-500">
              Unable to load email thread
            </div>
          )}

          {!isLoading && !isError && thread && (
            <>
              {thread.emails.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No emails sent yet
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {thread.emails.map((email) => (
                    <EmailMessageCard key={email.id} email={email} shipmentId={shipmentId} shipment={shipment} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Placeholder when API not connected */}
          {!isLoading && !isError && !thread && (
            <div className="p-4 text-center text-sm text-gray-500">
              Email thread API not connected yet.
              <br />
              <span className="text-xs text-gray-400">See docs/API_Get_Email_Thread_Spec.md</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmailMessageCard({ email, shipmentId, shipment }: { email: EmailMessage; shipmentId: string; shipment?: Shipment }) {
  const [expanded, setExpanded] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const isInbound = email.direction === 'inbound';
  const timestamp = email.sentAt || email.receivedAt;

  return (
    <div className={cn(
      "p-4",
      isInbound ? "bg-green-50/50" : "bg-gray-50/50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
          isInbound ? "bg-green-100" : "bg-blue-100"
        )}>
          {isInbound ? (
            <ArrowDownLeft className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                isInbound
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              )}>
                {isInbound ? 'Received' : 'Sent'}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">
                {email.from}
              </span>
              {email.hasAttachment && (
                <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 flex-shrink-0">
                {timestamp && new Date(timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {isInbound && !showReplyForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(true)}
                  className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Reply className="h-3.5 w-3.5 mr-1" />
                  Reply
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 mt-1">{email.subject}</p>

          {/* Email body preview/full */}
          <div className="mt-2">
            <p className={cn(
              "text-sm text-gray-600 whitespace-pre-wrap",
              !expanded && "line-clamp-3"
            )}>
              {stripHtml(email.body)}
            </p>
            {email.body.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <ReplyForm
              shipmentId={shipmentId}
              replyTo={email.from}
              originalSubject={email.subject}
              originalBody={email.body}
              shipment={shipment}
              onClose={() => setShowReplyForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyFormProps {
  shipmentId: string;
  replyTo: string;
  originalSubject: string;
  originalBody: string;
  shipment?: Shipment;
  onClose: () => void;
}

function ReplyForm({ shipmentId, replyTo, originalSubject, originalBody, shipment, onClose }: ReplyFormProps) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);


  // Generate default reply message based on shipment data
  const generateDefaultMessage = () => {
    if (!shipment) return '';

    const missingFields = parseMissingFields(shipment.missingFields);
    const vehiclesMissingWeight = parseVehiclesMissingWeight(shipment.vehiclesMissingWeight);
    const senderName = replyTo.split('@')[0].split('.')[0];
    const capitalizedName = senderName.charAt(0).toUpperCase() + senderName.slice(1);

    // Build list of remaining issues
    const issues: string[] = [];

    // Check for missing vessel
    if (!shipment.vesselVoyage || missingFields.some(f => f.toLowerCase().includes('vessel'))) {
      issues.push('- Vessel name is still required');
    }

    // Check for container number issues
    if (missingFields.some(f => f.toLowerCase().includes('container'))) {
      issues.push('- Container number verification still required');
    }

    // Check for duplicate VINs
    if (missingFields.some(f => f.toLowerCase().includes('duplicate'))) {
      issues.push('- Duplicate VIN issue still needs to be resolved');
    }

    // Check for missing HS codes
    if (missingFields.some(f => f.toLowerCase().includes('hs_code') || f.toLowerCase().includes('hs code'))) {
      issues.push('- HS codes are still missing');
    }

    // Check for missing port of destination
    const hasPOD = shipment.podCode || shipment.portOfDestination;
    if (!hasPOD || missingFields.some(f => f.toLowerCase().includes('destination'))) {
      issues.push('- Port of destination is still required');
    }

    // Check for vehicle weights
    if (vehiclesMissingWeight.length > 0) {
      issues.push(`- Vehicle weights still missing for:\n${vehiclesMissingWeight.map(v => `  • ${v}`).join('\n')}`);
    }

    // Check for any other missing fields not already covered
    const handledPatterns = ['vessel', 'container', 'duplicate', 'hs_code', 'hs code', 'destination', 'vehicle', 'weight', 'port_of_loading'];
    missingFields.forEach(field => {
      const lowerField = field.toLowerCase();
      if (!handledPatterns.some(p => lowerField.includes(p))) {
        const formatted = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        issues.push(`- ${formatted} is still required`);
      }
    });

    if (issues.length === 0) {
      // All data received - thank you message
      return `Dear ${capitalizedName},

Thank you for providing the information for BL ${shipment.blNumber}.

All required data has been received and the shipment documentation is now complete.

Best regards,
Documentation Specialist
WalWil Shipping`;
    }

    // Still missing data - request remaining info
    return `Dear ${capitalizedName},

Thank you for your response regarding BL ${shipment.blNumber}.

However, we still require the following information:

${issues.join('\n')}

Please provide this information at your earliest convenience so we can complete the documentation.

Best regards,
Documentation Specialist
WalWil Shipping`;
  };

  const [message, setMessage] = useState(generateDefaultMessage());

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendShipmentEmail(shipmentId, {
        to: replyTo,
        subject: `RE: ${originalSubject}`, // Subject ignored - reply uses original thread
        body: message,
      });

      if (result.success) {
        setSent(true);
        toast.success('Reply sent successfully', {
          description: `Sent to ${replyTo}`,
        });
        // Refresh email thread
        queryClient.invalidateQueries({ queryKey: ['email-thread', shipmentId] });
        // Close form after short delay
        setTimeout(() => onClose(), 1500);
      } else {
        toast.error('Failed to send reply', {
          description: result.message || 'Please try again',
        });
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Reply to {replyTo}</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className="bg-white resize-none"
          />
        </div>

        {/* Original message quote */}
        <details className="text-xs">
          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
            Show original message
          </summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
            {stripHtml(originalBody)}
          </div>
        </details>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSending || sent}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Sent
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                Send Reply
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
