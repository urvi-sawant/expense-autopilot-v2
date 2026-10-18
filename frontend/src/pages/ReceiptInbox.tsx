import React, { useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, RefreshCw, Eye, AlertCircle, Plus, Trash2, ZoomIn, ZoomOut,
  RotateCw, Check, ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { LineItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface ReceiptInboxProps {
  onRefreshAll: () => Promise<void>;
  onNavigateToExpenses: () => void;
}

export const ReceiptInbox: React.FC<ReceiptInboxProps> = ({
  onRefreshAll,
  onNavigateToExpenses
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Form Fields after extraction
  const [merchant, setMerchant] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [category, setCategory] = useState('Meals');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [subtotal, setSubtotal] = useState<string>('');
  const [cgstAmount, setCgstAmount] = useState<string>('');
  const [sgstAmount, setSgstAmount] = useState<string>('');
  const [igstAmount, setIgstAmount] = useState<string>('');
  const [taxPercentage, setTaxPercentage] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  const [rawText, setRawText] = useState<string>('');
  const [arithmeticError, setArithmeticError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsUploading(true);
      setUploadError(null);
      setSubmissionSuccess(null);
      setZoomLevel(1);
      setRotation(0);

      try {
        const empId = user?.employee_id || user?.id || 'EMP-001';
        const res = await api.uploadReceipt(file, empId);
        setUploadResult(res);

        if (res.parsed_data) {
          const p = res.parsed_data;
          setMerchant(p.merchant || '');
          setReceiptNumber(p.receipt_number || '');
          setDate(p.date || new Date().toISOString().slice(0, 10));
          setCurrency(p.currency || 'INR');
          setCategory(p.suggested_category || res.suggested_category || 'Meals');
          setPaymentMethod(p.payment_method || 'Corporate Card');

          setSubtotal(p.subtotal != null ? p.subtotal.toString() : '');
          setCgstAmount(p.cgst_amount != null && p.cgst_amount > 0 ? p.cgst_amount.toString() : '');
          setSgstAmount(p.sgst_amount != null && p.sgst_amount > 0 ? p.sgst_amount.toString() : '');
          setIgstAmount(p.igst_amount != null && p.igst_amount > 0 ? p.igst_amount.toString() : '');
          setTaxPercentage(p.tax_percentage != null ? p.tax_percentage.toString() : '');
          setTaxAmount(p.tax_amount != null ? p.tax_amount.toString() : '');
          setTotalAmount(p.total_amount != null ? p.total_amount.toString() : '');

          setLineItems(p.line_items || []);
          setConfidenceScores(p.confidence_scores || {});
          setRawText(p.raw_text || '');

          if (!p.arithmetic_valid && p.arithmetic_error) {
            setArithmeticError(p.arithmetic_error);
          } else {
            setArithmeticError(null);
          }
        }
      } catch (err: any) {
        console.error('Error uploading receipt:', err);
        setUploadError(err.message || 'Failed to process receipt image. Please try again or check backend service.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Recalculate tax and subtotal check dynamically
  const parsedSubtotal = parseFloat(subtotal) || 0;
  const parsedTax = parseFloat(taxAmount) || 0;
  const parsedTotal = parseFloat(totalAmount) || 0;
  const sumCalc = Math.round((parsedSubtotal + parsedTax) * 100) / 100;
  const hasDynamicMismatch = parsedSubtotal > 0 && parsedTax > 0 && parsedTotal > 0 && Math.abs(sumCalc - parsedTotal) > 0.05;

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      item_id: `li-user-${Date.now()}`,
      description: 'New Item',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      is_excluded: false
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      const u = field === 'unit_price' ? parseFloat(value) || 0 : item.unit_price;
      item.total_price = Math.round(q * u * 100) / 100;
    }
    updated[index] = item;
    setLineItems(updated);
  };

  const handleDeleteLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmitExpense = async () => {
    setIsSubmitting(true);
    setUploadError(null);
    try {
      const empId = user?.employee_id || user?.id || 'EMP-001';
      const parsedAmount = parseFloat(totalAmount) || parsedSubtotal + parsedTax || 0;

      const payload = {
        employee_id: empId,
        date: date || new Date().toISOString().slice(0, 10),
        merchant: merchant || 'Unknown Merchant',
        category: category,
        amount: parsedAmount,
        currency: currency,
        subtotal: parsedSubtotal,
        tax_amount: parsedTax,
        cgst_amount: parseFloat(cgstAmount) || 0,
        sgst_amount: parseFloat(sgstAmount) || 0,
        igst_amount: parseFloat(igstAmount) || 0,
        tax_percentage: parseFloat(taxPercentage) || undefined,
        receipt_id: uploadResult?.receipt?.receipt_id,
        receipt_number: receiptNumber || undefined,
        payment_method: paymentMethod || 'Corporate Card',
        raw_file_url: uploadResult?.receipt?.raw_file_url,
        image_phash: uploadResult?.parsed_data?.image_phash,
        arithmetic_mismatch: hasDynamicMismatch || !!arithmeticError,
        line_items: lineItems.length > 0 ? lineItems : [
          {
            item_id: 'li-1',
            description: `${category} Claim at ${merchant || 'Merchant'}`,
            quantity: 1,
            unit_price: parsedSubtotal || parsedAmount,
            total_price: parsedSubtotal || parsedAmount,
            is_excluded: false
          }
        ]
      };

      const res = await api.submitExpense(payload);
      setSubmissionSuccess(`Expense Claim ${res.expense.id} submitted! Autopilot status: ${res.expense.status}.`);
      await onRefreshAll();
    } catch (err: any) {
      console.error('Submission failed:', err);
      setUploadError(err.message || 'Failed to submit claim. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.6) 0%, rgba(253, 246, 226, 0.7) 100%)',
        border: '1px solid var(--border-purple-thin)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={16} color="#7c3aed" />
          <span style={{ fontSize: 13, color: '#6d28d9', fontWeight: 600 }}>
            Employee Experience: Native OCR & Document Intelligence
          </span>
        </div>
        <h2 style={{ fontSize: 24, color: 'var(--text-navy-primary)', fontWeight: 700 }}>
          Automatic Receipt Extraction & Claim Filing
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-navy-secondary)', maxWidth: 750, marginTop: 4, lineHeight: 1.5 }}>
          Upload your bill or invoice (Image or PDF). Our native Windows OCR engine automatically extracts merchant, receipt number, date, currency, subtotal, GST breakdown (CGST/SGST), tax percentage, line items, and payment method. Review and verify the details before submission.
        </p>
      </div>

      {/* Upload Drop Zone Card */}
      <div className="glass-panel" style={{ padding: 24, border: '1px solid var(--border-purple-thin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-navy-primary)', fontWeight: 700 }}>
            Upload Receipt or Bill
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-navy-muted)' }}>
            Logged in as: <strong>{user?.name}</strong> ({user?.role})
          </span>
        </div>

        <div style={{
          border: '2px dashed var(--border-purple-active)',
          borderRadius: 12,
          padding: '36px 20px',
          textAlign: 'center',
          background: 'var(--bg-card-subtle)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'border-color 0.2s ease'
        }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={isUploading}
            onChange={handleFileChange}
            id="receipt-file-input"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: isUploading ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 99,
              background: 'var(--pastel-blue-bg)',
              border: '1px solid var(--pastel-blue-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pastel-blue-text)'
            }}>
              {isUploading ? <RefreshCw className="spin" size={26} /> : <UploadCloud size={28} />}
            </div>

            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                {isUploading ? 'Extracting Receipt Information...' : selectedFile ? selectedFile.name : 'Click to select bill or drag receipt here'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-navy-muted)', marginTop: 4 }}>
                Supports JPEG, PNG, WEBP, and digital PDF bills • Real OCR text parsing & GST separation
              </div>
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {isUploading && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: 'var(--pastel-blue-bg)',
            border: '1px solid var(--pastel-blue-border)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <RefreshCw className="spin" size={20} color="var(--pastel-blue-text)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pastel-blue-text)' }}>
                Processing Receipt Document
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-navy-secondary)' }}>
                Executing native image preprocessing, Windows OCR recognition, line-item itemization, and tax calculations...
              </div>
            </div>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div style={{
            marginTop: 16,
            padding: 14,
            background: 'var(--rose-bg)',
            border: '1px solid var(--rose-border)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--rose-text)'
          }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Submission Success Banner */}
      {submissionSuccess && (
        <div style={{
          padding: 24,
          background: 'var(--emerald-bg)',
          border: '1px solid var(--emerald-border)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <CheckCircle2 size={36} color="var(--emerald-text)" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--emerald-text)' }}>
              Expense Successfully Filed
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-navy-secondary)', marginTop: 4 }}>
              {submissionSuccess}
            </div>
          </div>
          <button
            onClick={onNavigateToExpenses}
            className="btn btn-primary"
            style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span>View In My Expenses</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Side-by-Side Comparison Workspace (Active when receipt selected or uploaded) */}
      {(selectedFile || uploadResult) && !submissionSuccess && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 24, alignItems: 'start' }}>
          {/* Left Column: Original Receipt Viewer */}
          <div className="glass-panel" style={{
            padding: 20,
            border: '1px solid var(--border-purple-thin)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                  Original Uploaded Receipt
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-navy-muted)' }}>
                  Side-by-side comparison with extracted data
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.2))}
                  title="Zoom Out"
                  style={{ padding: 6, background: 'var(--bg-main)', border: '1px solid var(--border-purple-thin)', borderRadius: 6, cursor: 'pointer' }}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.2))}
                  title="Zoom In"
                  style={{ padding: 6, background: 'var(--bg-main)', border: '1px solid var(--border-purple-thin)', borderRadius: 6, cursor: 'pointer' }}
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((rotation + 90) % 360)}
                  title="Rotate"
                  style={{ padding: 6, background: 'var(--bg-main)', border: '1px solid var(--border-purple-thin)', borderRadius: 6, cursor: 'pointer' }}
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>

            {/* Document display viewport */}
            <div style={{
              minHeight: 460,
              maxHeight: 600,
              overflow: 'auto',
              background: '#0f172a',
              borderRadius: 8,
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}>
              {previewUrl ? (
                selectedFile?.type.includes('pdf') ? (
                  <iframe
                    src={previewUrl}
                    title="PDF Receipt"
                    style={{ width: '100%', height: 480, border: 'none', borderRadius: 4 }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    style={{
                      maxWidth: '100%',
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease',
                      borderRadius: 4
                    }}
                  />
                )
              ) : uploadResult?.receipt?.raw_file_url ? (
                <img
                  src={`http://127.0.0.1:8000${uploadResult.receipt.raw_file_url}`}
                  alt="Receipt"
                  style={{
                    maxWidth: '100%',
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease'
                  }}
                />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                  No receipt image available
                </div>
              )}
            </div>

            {/* Raw OCR Text Toggle */}
            {rawText && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowRawOcr(!showRawOcr)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6d28d9',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Eye size={14} />
                  <span>{showRawOcr ? 'Hide Raw OCR Text' : 'View Raw Extracted OCR Text'}</span>
                </button>

                {showRawOcr && (
                  <pre style={{
                    marginTop: 8,
                    padding: 12,
                    background: 'var(--bg-main)',
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    maxHeight: 180,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-navy-secondary)',
                    border: '1px solid var(--border-purple-thin)'
                  }}>
                    {rawText}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Extracted Fields Review & Correction Form */}
          <div className="glass-panel" style={{
            padding: 24,
            border: '1px solid var(--border-purple-thin)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                  Extracted Receipt Details
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-navy-muted)' }}>
                  Verify and edit values before submitting to the policy engine
                </span>
              </div>
              <span style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 99,
                background: 'var(--pastel-blue-bg)',
                color: 'var(--pastel-blue-text)',
                fontWeight: 600
              }}>
                Ready for Review
              </span>
            </div>

            {/* Arithmetic Mismatch Warning Banner */}
            {(hasDynamicMismatch || arithmeticError) && (
              <div style={{
                padding: 14,
                background: 'var(--beige-bg)',
                border: '1px solid var(--beige-border)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                color: 'var(--beige-text)'
              }}>
                <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                  <strong>Arithmetic Discrepancy Flagged:</strong> {arithmeticError || `Calculated subtotal (₹${parsedSubtotal}) + tax (₹${parsedTax}) = ₹${sumCalc}, which differs from the total amount (₹${parsedTotal}). The printed total is preserved for audit compliance. Please verify.`}
                </div>
              </div>
            )}

            {/* Merchant & Bill # */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)' }}>
                    MERCHANT NAME *
                  </label>
                  {confidenceScores.merchant && (
                    <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                      {Math.round(confidenceScores.merchant * 100)}% Match
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={merchant}
                  placeholder="e.g. Starbucks, Taj Hotels, Uber"
                  onChange={(e) => setMerchant(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)', display: 'block', marginBottom: 4 }}>
                  BILL / RECEIPT NO.
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  placeholder="e.g. INV-9042"
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            {/* Date, Currency, Category, Payment Method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1.2fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)', display: 'block', marginBottom: 4 }}>
                  DATE *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)', display: 'block', marginBottom: 4 }}>
                  CURRENCY
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)', display: 'block', marginBottom: 4 }}>
                  SUGGESTED CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Meals">Meals</option>
                  <option value="Lodging">Lodging</option>
                  <option value="Transport">Transport</option>
                  <option value="Client Entertainment">Client Entertainment</option>
                  <option value="Office Supplies">Office Supplies</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)', display: 'block', marginBottom: 4 }}>
                  PAYMENT METHOD
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  placeholder="Corporate Card / UPI"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* GST Breakdown & Total Card */}
            <div style={{
              padding: 16,
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-purple-thin)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                  FINANCIAL & GST BREAKDOWN
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-navy-muted)' }}>
                  CGST + SGST or IGST extracted automatically
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-navy-muted)', display: 'block', marginBottom: 2 }}>
                    SUBTOTAL ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={subtotal}
                    placeholder="0.00"
                    onChange={(e) => setSubtotal(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-navy-muted)', display: 'block', marginBottom: 2 }}>
                    TAX % (RATE)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxPercentage}
                    placeholder="e.g. 5 or 18"
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-navy-muted)', display: 'block', marginBottom: 2 }}>
                    CGST AMOUNT
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cgstAmount}
                    placeholder="0.00"
                    onChange={(e) => setCgstAmount(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-navy-muted)', display: 'block', marginBottom: 2 }}>
                    SGST AMOUNT
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sgstAmount}
                    placeholder="0.00"
                    onChange={(e) => setSgstAmount(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 4 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-navy-muted)', display: 'block', marginBottom: 2 }}>
                    IGST AMOUNT
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={igstAmount}
                    placeholder="0.00"
                    onChange={(e) => setIgstAmount(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-navy-muted)', display: 'block', marginBottom: 2 }}>
                    TOTAL TAX ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxAmount}
                    placeholder="0.00"
                    onChange={(e) => setTaxAmount(e.target.value)}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#6d28d9', display: 'block', marginBottom: 2 }}>
                    TOTAL AMOUNT DUE ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    placeholder="0.00"
                    onChange={(e) => setTotalAmount(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      borderColor: '#8b5cf6',
                      background: 'rgba(237, 233, 254, 0.4)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Individual Purchased Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                  ITEMIZED LINE ITEMS ({lineItems.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  style={{
                    background: 'var(--pastel-blue-bg)',
                    border: '1px solid var(--pastel-blue-border)',
                    color: 'var(--pastel-blue-text)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Plus size={13} />
                  <span>Add Line Item</span>
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div style={{
                  padding: 12,
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'var(--text-navy-muted)'
                }}>
                  No specific line items separated. Total bill amount will be submitted.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {lineItems.map((item, idx) => (
                    <div key={item.item_id || idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 0.6fr 1fr 1fr auto',
                      gap: 8,
                      alignItems: 'center',
                      background: 'var(--bg-card-subtle)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-purple-thin)'
                    }}>
                      <input
                        type="text"
                        value={item.description}
                        placeholder="Description"
                        onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                        style={{ fontSize: 12 }}
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        placeholder="Qty"
                        onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                        style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        placeholder="Unit Price"
                        onChange={(e) => handleUpdateLineItem(idx, 'unit_price', e.target.value)}
                        style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      />
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right' }}>
                        {currency} {item.total_price.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLineItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Submit Button */}
            <button
              onClick={handleSubmitExpense}
              disabled={isSubmitting || !merchant || !totalAmount}
              className="btn btn-primary"
              style={{
                marginTop: 8,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 8
              }}
            >
              <Sparkles size={16} />
              <span>{isSubmitting ? 'Submitting & Evaluating Policy...' : 'Submit Claim to Autopilot'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
