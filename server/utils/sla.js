export const getSLAHours = () => {
  // Default SLA is 24 hours for all tickets
  return 24;
};

export const calculateSLADeadline = (createdAt) => {
  const hours = getSLAHours();
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
};

export const getSLAStatus = (deadline) => {
  if (!deadline) return 'N/A';
  
  const now = new Date();
  const timeRemaining = deadline - now;
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);

  if (hoursRemaining < 0) return 'OVERDUE';
  if (hoursRemaining < 2) return 'URGENT';
  if (hoursRemaining < 8) return 'WARNING';
  return 'OK';
};

