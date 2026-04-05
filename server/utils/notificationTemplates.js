/**
 * Bilingual notification copy keyed by recipient preferredLocale (User.preferredLocale).
 */

const T = {
  NEW_ASSIGNED_TICKET: {
    en: (p) => ({ title: 'New task', message: `New ticket assigned: ${p.title}` }),
    ar: (p) => ({ title: 'مهمة جديدة', message: `تم تعيين تذكرة جديدة: ${p.title}` })
  },
  ACTION_REQUIRED: {
    en: (p) => ({
      title: 'Action required',
      message: `Engineer requested your confirmation on ticket: ${p.title}`
    }),
    ar: (p) => ({
      title: 'إجراء مطلوب',
      message: `طلب منك المهندس التأكيد على التذكرة: ${p.title}`
    })
  },
  USER_CONFIRMED: {
    en: (p) => ({
      title: 'User confirmed',
      message: `User replied to your action request on ticket: ${p.title}`
    }),
    ar: (p) => ({
      title: 'تأكيد المستخدم',
      message: `رد المستخدم على طلب الإجراء للتذكرة: ${p.title}`
    })
  },
  NEW_TICKET: {
    en: (p) => ({ title: 'New ticket', message: `New ticket assigned: ${p.title}` }),
    ar: (p) => ({ title: 'تذكرة جديدة', message: `تم تعيين تذكرة جديدة: ${p.title}` })
  },
  NEW_TICKET_TEAM: {
    en: (p) => ({
      title: 'New ticket',
      message: `New ticket assigned to ${p.teamName} team: ${p.title}`
    }),
    ar: (p) => ({
      title: 'تذكرة جديدة',
      message: `تم تعيين تذكرة جديدة لفريق ${p.teamName}: ${p.title}`
    })
  },
  TICKET_REASSIGNED_TEAM: {
    en: (p) => ({
      title: 'Ticket reassigned',
      message: `Ticket reassigned to ${p.teamName} team: ${p.title}`
    }),
    ar: (p) => ({
      title: 'إعادة تعيين التذكرة',
      message: `تمت إعادة تعيين التذكرة لفريق ${p.teamName}: ${p.title}`
    })
  },
  TICKET_REASSIGNED_TECH: {
    en: (p) => ({
      title: 'Ticket reassigned',
      message: `Ticket reassigned: ${p.title}`
    }),
    ar: (p) => ({
      title: 'إعادة تعيين مهمة',
      message: `تم إعادة تعيين التذكرة: ${p.title}`
    })
  },
  REASSIGN_REQUEST_CREATED: {
    en: (p) => ({
      title: 'Reassignment request',
      message: `${p.requester} requested reassignment to ${p.targetEngineer} for "${p.title}". Auto-approval in ${p.minutes} minutes.`
    }),
    ar: (p) => ({
      title: 'طلب إعادة تعيين',
      message: `${p.requester} طلب إعادة التعيين إلى ${p.targetEngineer} للتذكرة "${p.title}". اعتماد تلقائي خلال ${p.minutes} دقيقة.`
    })
  },
  REASSIGN_REQUEST_APPROVED: {
    en: (p) => ({
      title: 'Reassignment approved',
      message: `Reassignment approved for "${p.title}" to ${p.targetEngineer}.`
    }),
    ar: (p) => ({
      title: 'تم اعتماد إعادة التعيين',
      message: `تم اعتماد إعادة تعيين "${p.title}" إلى ${p.targetEngineer}.`
    })
  },
  REASSIGN_REQUEST_AUTO_APPROVED: {
    en: (p) => ({
      title: 'Reassignment auto-approved',
      message: `Reassignment auto-approved for "${p.title}" to ${p.targetEngineer}.`
    }),
    ar: (p) => ({
      title: 'تم اعتماد إعادة التعيين تلقائياً',
      message: `تم اعتماد إعادة تعيين "${p.title}" تلقائياً إلى ${p.targetEngineer}.`
    })
  },
  REASSIGN_REQUEST_REJECTED: {
    en: (p) => ({
      title: 'Reassignment rejected',
      message: p.rejectionReason
        ? `Reassignment rejected for "${p.title}": ${p.rejectionReason}`
        : `Reassignment rejected for "${p.title}".`
    }),
    ar: (p) => ({
      title: 'تم رفض إعادة التعيين',
      message: p.rejectionReason
        ? `تم رفض إعادة التعيين للتذكرة "${p.title}": ${p.rejectionReason}`
        : `تم رفض إعادة التعيين للتذكرة "${p.title}".`
    })
  },
  REBALANCE_NEW: {
    en: (p) => ({ title: 'New task', message: `New ticket assigned: ${p.title}` }),
    ar: (p) => ({ title: 'مهمة جديدة', message: `تم تعيين تذكرة جديدة: ${p.title}` })
  },
  REBALANCE_REMOVED: {
    en: (p) => ({
      title: 'Ticket reassigned',
      message: `Ticket redistributed: ${p.title}`
    }),
    ar: (p) => ({
      title: 'تمت إعادة توزيع مهمة',
      message: `تمت إعادة توزيع تذكرة: ${p.title}`
    })
  },
  STATUS_UPDATED: {
    en: (p) => ({ title: 'Ticket status updated', message: p.message }),
    ar: (p) => ({ title: 'تحديث حالة التذكرة', message: p.messageAr || p.message })
  },
  STATUS_UPDATED_ASSIGNEE: {
    en: (p) => ({
      title: 'Ticket status updated',
      message: `Ticket "${p.title}" status changed to ${p.status}`
    }),
    ar: (p) => ({
      title: 'تحديث حالة التذكرة',
      message: `تذكرة "${p.title}" تغيّرت حالتها إلى ${p.status}`
    })
  },
  SLA_WARNING: {
    en: (p) => ({
      title: 'SLA warning',
      message: `Ticket "${p.title}" will expire in ${p.hours} hours`
    }),
    ar: (p) => ({
      title: 'تنبيه SLA',
      message: `تذكرة "${p.title}" ستنتهي خلال ${p.hours} ساعة`
    })
  },
  SUGGESTION_NEW: {
    en: (p) => ({
      title: 'New suggestion',
      message: `${p.authorName}: ${p.suggestionTitle}`
    }),
    ar: (p) => ({
      title: 'اقتراح جديد',
      message: `${p.authorName}: ${p.suggestionTitle}`
    })
  },
  SUGGESTION_REVIEWED: {
    en: () => ({
      title: 'Suggestion reviewed',
      message: 'Your suggestion has been reviewed'
    }),
    ar: () => ({
      title: 'تمت مراجعة الاقتراح',
      message: 'تمت مراجعة اقتراحك'
    })
  },
  RESOLVED_COMMENT: {
    en: (p) => ({
      title: 'New comment on resolved ticket',
      message: `${p.title}: new comment from the requester`
    }),
    ar: (p) => ({
      title: 'تعليق على تذكرة محلولة',
      message: `${p.title}: تعليق جديد من صاحب الطلب`
    })
  }
};

export function getNotificationStrings(key, locale, params = {}) {
  const loc = locale === 'ar' ? 'ar' : 'en';
  const fn = T[key]?.[loc] || T[key]?.en;
  if (!fn) {
    return { title: key, message: JSON.stringify(params) };
  }
  return fn(params);
}
