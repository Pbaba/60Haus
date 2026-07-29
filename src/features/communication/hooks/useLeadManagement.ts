import { useState } from 'react';
import { LeadStatus } from '../../../types';
import { leadService } from '../services/leadService';

export const useLeadManagement = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (conversationId: string, status: LeadStatus) => {
    setIsUpdating(true);
    const success = await leadService.updateLeadStatus(conversationId, status);
    setIsUpdating(false);
    return success;
  };

  return {
    isUpdating,
    updateStatus
  };
};
