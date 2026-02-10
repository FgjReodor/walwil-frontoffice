'use client';

import { Charge } from '@/types/shipment';

interface ChargesTableProps {
  charges: Charge[];
}

export function ChargesTable({ charges }: ChargesTableProps) {
  const totalAmount = charges.reduce((sum, c) => sum + c.amount, 0);
  const currency = charges[0]?.currency || 'USD';

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">
          Charges ({charges.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Code</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
              <th className="text-right px-4 py-2 font-medium">Qty</th>
              <th className="text-right px-4 py-2 font-medium">Rate</th>
              <th className="text-right px-4 py-2 font-medium">Amount</th>
              <th className="text-left px-4 py-2 font-medium">Terms</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {charges.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-amber-600 bg-amber-50">
                  No rates available for this route. Charges will need to be added manually or the rate sheet updated.
                </td>
              </tr>
            ) : (
              charges.map((charge) => (
                <tr key={charge.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs font-medium text-gray-900">
                    {charge.chargeCode}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{charge.description}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{charge.quantity}</td>
                  <td className="px-4 py-2 text-right text-gray-700">
                    {charge.rate?.toFixed(2)} {charge.currency}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {charge.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })} {charge.currency}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      charge.freightTerms === 'PREPAID'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {charge.freightTerms}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-700">
                Total
              </td>
              <td className="px-4 py-2 text-right font-bold text-gray-900">
                {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
