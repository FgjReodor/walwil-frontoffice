'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shipment } from '@/types/shipment';
import { Mail, Copy, Check, Loader2, CheckCircle } from 'lucide-react';
import { parseMissingFields, parseVehiclesMissingWeight } from '@/lib/priority';
import { sendShipmentEmail } from '@/app/shipments/actions/shipments';
import { toast } from 'sonner';

interface SendEmailFormProps {
  toEmail: string;
  shipment: Shipment;
}

export function SendEmailForm({ toEmail, shipment }: SendEmailFormProps) {
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const missingFields = parseMissingFields(shipment.missingFields);
  const vehiclesMissingWeight = parseVehiclesMissingWeight(shipment.vehiclesMissingWeight);


  // Generate default message based on ALL issues
  const getDefaultMessage = () => {
    const senderName = toEmail.split('@')[0].split('.')[0];
    const capitalizedName = senderName.charAt(0).toUpperCase() + senderName.slice(1);

    // Build list of all issues
    const issues: string[] = [];

    // Check for missing vessel
    if (!shipment.vesselVoyage || missingFields.some(f => f.toLowerCase().includes('vessel'))) {
      issues.push('- Vessel name is missing or unclear');
    }

    // Check for container number issues
    if (missingFields.some(f => f.toLowerCase().includes('container'))) {
      issues.push('- Container number does not follow the standard ISO format');
    }

    // Check for duplicate VINs
    if (missingFields.some(f => f.toLowerCase().includes('duplicate'))) {
      issues.push('- Duplicate VIN numbers were found in the vehicle list');
    }

    // Check for missing HS codes
    if (missingFields.some(f => f.toLowerCase().includes('hs_code') || f.toLowerCase().includes('hs code'))) {
      issues.push('- HS codes are missing for customs declaration');
    }

    // Check for missing port of destination
    const hasPOD = shipment.podCode || shipment.portOfDestination;
    if (!hasPOD || missingFields.some(f => f.toLowerCase().includes('port_of_destination') || f.toLowerCase().includes('destination'))) {
      issues.push('- Port of destination is missing');
    }

    // Check for vehicle weights
    if (vehiclesMissingWeight.length > 0) {
      issues.push(`- Vehicle weights are missing for the following VINs:\n${vehiclesMissingWeight.map(v => `  • ${v}`).join('\n')}`);
    }

    // Check for any other missing fields not already covered
    const handledPatterns = ['vessel', 'container', 'duplicate', 'hs_code', 'hs code', 'destination', 'vehicle', 'weight', 'port_of_loading'];
    missingFields.forEach(field => {
      const lowerField = field.toLowerCase();
      if (!handledPatterns.some(p => lowerField.includes(p))) {
        // Format field name nicely
        const formatted = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        issues.push(`- ${formatted} is missing or requires verification`);
      }
    });

    // Build the header line, handling missing values
    const vesselPart = shipment.vesselVoyage ? ` for vessel ${shipment.vesselVoyage}` : '';
    const polValue = shipment.polCode || shipment.departureFrom;
    const podValue = shipment.podCode || shipment.portOfDestination;
    const routePart = polValue && podValue
      ? ` departing ${polValue} to ${podValue}`
      : podValue
        ? ` to ${podValue}`
        : '';

    const issueText = issues.length > 0
      ? `The following issues were detected:\n\n${issues.join('\n\n')}\n\nPlease provide the missing information or clarification at your earliest convenience.`
      : 'Please review the documentation and confirm all details are correct.';

    return `Dear ${capitalizedName},

We have identified issues with the shipping documentation for booking ${shipment.blNumber}${vesselPart}${routePart}.

${issueText}

Best regards,
Documentation Specialist
WalWil Shipping`;
  };

  const [message, setMessage] = useState(getDefaultMessage());

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(toEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    setIsSending(true);

    try {
      const result = await sendShipmentEmail(shipment.id, {
        to: toEmail,
        subject: `RE: ${shipment.blNumber}`, // Subject ignored - reply uses original thread
        body: message,
      });

      if (result.success) {
        setEmailSent(true);
        toast.success('Email sent successfully', {
          description: `Sent to ${toEmail}`,
        });
      } else {
        toast.error('Failed to send email', {
          description: result.message || 'Please try again',
        });
      }
    } catch (error) {
      toast.error('An unexpected error occurred', {
        description: 'Please try again later',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-4 w-4 text-blue-600" />
        </div>
        <span className="font-medium text-gray-900">Your Action: Send Email</span>
      </div>

      <div className="space-y-4">
        {/* To Field */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            To
          </label>
          <div className="relative">
            <Input
              value={toEmail}
              readOnly
              className="pr-10 bg-gray-50"
            />
            <button
              type="button"
              onClick={handleCopyEmail}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Message Field - Subject is inherited from original email thread */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="resize-none"
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendEmail}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isSending || emailSent}
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : emailSent ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Email Sent
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
