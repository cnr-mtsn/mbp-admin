import Link from 'next/link';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import { extractUuid } from '../../lib/utils/gid';
import paymentStyles from '../../styles/payments.module.css';

export default function PaymentList({ payments = [], emptyMessage = 'No payments recorded yet.' }) {
  if (!payments || payments.length === 0) {
    return <p className={paymentStyles.emptyMessage}>{emptyMessage}</p>;
  }

  const sortedPayments = [...payments].sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));

  return (
    <div className={paymentStyles.paymentList}>
      {sortedPayments.map(payment => {
        const appliedTotal = (payment.invoices || []).reduce((sum, invoiceLink) => sum + (parseFloat(invoiceLink.amount_applied) || 0), 0);

        return (
          <Link
            key={payment.id}
            href={`/payments/${extractUuid(payment.id)}`}
            className={paymentStyles.paymentRow}
          >
            <div className={paymentStyles.paymentSummary}>
              <p className={paymentStyles.paymentAmount}>{formatMoney(appliedTotal || payment.total_amount || 0)}</p>
              <p className={paymentStyles.paymentMeta}>
                {payment.payment_method ? payment.payment_method.replace(/_/g, ' ') : 'Payment'}
              </p>
            </div>
            <div className={paymentStyles.paymentMeta}>
              {payment.payment_date ? formatDate(payment.payment_date) : '—'}
            </div>
            <div className={paymentStyles.paymentInvoices}>
              {(payment.invoices || []).map(invoiceLink => (
                <div key={invoiceLink.id} className={paymentStyles.paymentInvoiceRow}>
                  <span className={paymentStyles.paymentInvoiceTitle}>
                    {invoiceLink.invoice?.invoice_number
                      ? `Invoice ${invoiceLink.invoice.invoice_number}`
                      : invoiceLink.invoice?.title || 'Invoice'}
                  </span>
                  <span className={paymentStyles.paymentInvoiceAmount}>
                    {formatMoney(invoiceLink.amount_applied || 0)}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
