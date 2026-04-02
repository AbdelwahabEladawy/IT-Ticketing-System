import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import api from '../utils/api';

interface IssueTypesResponse {
  issueTypesByTeam: Record<string, string[]>;
  allIssueTypes: string[];
}

interface TicketFormData {
  issueType: string;
  title: string;
  description: string;
  anydeskNumber: string;
}

const stepTitles: Record<number, string> = {
  1: 'حدد نوع المشكلة',
  2: 'اكتب عنوان المشكلة',
  3: 'اكتب وصف المشكلة',
  4: 'أدخل رقم AnyDesk',
  5: 'مراجعة وإرسال التذكرة',
};

export default function ChatBotModal() {
  const [open, setOpen] = useState(false);
  const [issueTypes, setIssueTypes] = useState<IssueTypesResponse | null>(null);
  const [formData, setFormData] = useState<TicketFormData>({
    issueType: '',
    title: '',
    description: '',
    anydeskNumber: '',
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadIssueTypes();
  }, []);

  const loadIssueTypes = async () => {
    try {
      const response = await api.get('/issue-types');
      setIssueTypes(response.data);
    } catch (err) {
      console.error('Failed to load issue types', err);
      setIssueTypes({ issueTypesByTeam: { 'Other': ['Custom Problem'] }, allIssueTypes: ['Custom Problem'] });
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1 && !formData.issueType) {
      setError('اختر نوع المشكلة أولاً.');
      return;
    }

    if (step === 2 && !formData.title.trim()) {
      setError('ادخل عنوان المشكلة.');
      return;
    }

    if (step === 3 && !formData.description.trim()) {
      setError('ادخل وصف المشكلة.');
      return;
    }

    if (step === 4 && !formData.anydeskNumber.trim()) {
      setError('ادخل رقم AnyDesk.');
      return;
    }

    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.issueType || !formData.title.trim() || !formData.description.trim() || !formData.anydeskNumber.trim()) {
      setError('اكمل جميع البيانات قبل الإرسال.');
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      anydeskNumber: formData.anydeskNumber,
      problemType: formData.issueType ? 'PREDEFINED' : 'CUSTOM',
      issueType: formData.issueType || null,
    };

    setLoading(true);
    try {
      await api.post('/tickets', payload);
      setSuccess('تم إنشاء التذكرة بنجاح.');
      setStep(1);
      setFormData({ issueType: '', title: '', description: '', anydeskNumber: '' });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'فشل إنشاء التذكرة. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">اختر نوع المشكلة حتى يتم توجيه التذكرة للقسم المختص.</p>
          {issueTypes ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(issueTypes.issueTypesByTeam).map(([team, issues]) => (
                <div key={team} className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{team}</h3>
                  <div className="space-y-2">
                    {issues.map((issue) => (
                      <button
                        key={issue}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, issueType: issue }))}
                        className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                          formData.issueType === issue
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : 'border-transparent bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">Loading issue types...</div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">عنوان المشكلة</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="اكتب عنوان المشكلة"
          />
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">وصف المشكلة</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={5}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="اكتب التفاصيل التي يمكن أن تساعد الفني"
          />
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">رقم AnyDesk</label>
          <input
            type="text"
            value={formData.anydeskNumber}
            onChange={(e) => setFormData((prev) => ({ ...prev, anydeskNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="مثال: 123456789"
          />
          <p className="text-sm text-gray-500">يرجى إدخال رقم AnyDesk من 9 أو 10 أرقام.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">مراجعة التذكرة</p>
          <p className="mt-3 text-sm"><strong>نوع المشكلة:</strong> {formData.issueType}</p>
          <p className="text-sm"><strong>العنوان:</strong> {formData.title}</p>
          <p className="text-sm"><strong>الوصف:</strong> {formData.description}</p>
          <p className="text-sm"><strong>AnyDesk:</strong> {formData.anydeskNumber}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:bg-indigo-700"
      >
        <MessageCircle className="h-5 w-5" />
        Open Ticket Wizard
      </button> */}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Ticket Wizard</h2>
                <p className="text-xs text-gray-500">سأوجهك خطوة بخطوة لإنشاء التذكرة.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-4 py-5 sm:px-5">
              <div className="rounded-3xl border border-gray-200 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{stepTitles[step]}</p>
                <p className="mt-2 text-sm text-gray-600">الخطوة {step} من 5</p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              )}
              {success && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>
              )}

              {renderStepContent()}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1 || loading}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                العودة
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  التالي
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'جارٍ الإرسال...' : 'إنشاء التذكرة'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
