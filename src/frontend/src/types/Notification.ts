export const NotificationCode = {
    INVITATION_NEW: 'INVITATION_NEW',
    EVENT_UPDATED: 'EVENT_UPDATED',
    EVENT_CANCELLED: 'EVENT_CANCELLED',
    PARTICIPATION_ACCEPTED: 'PARTICIPATION_ACCEPTED',
    PARTICIPATION_UPDATED: 'PARTICIPATION_UPDATED',
    PARTICIPATION_CANCELLED: 'PARTICIPATION_CANCELLED',
    PARTICIPANT_JOINED: 'PARTICIPANT_JOINED'
} as const;

export type NotificationCode = (typeof NotificationCode)[keyof typeof NotificationCode];

export type NotificationSettings = Record<NotificationCode, boolean>;

export const NotificationLabel: Record<NotificationCode, string> = {
    [NotificationCode.INVITATION_NEW]: 'New Invitation',
    [NotificationCode.EVENT_UPDATED]: 'Event Updated',
    [NotificationCode.EVENT_CANCELLED]: 'Event Cancelled',
    [NotificationCode.PARTICIPATION_ACCEPTED]: 'Participation Accepted (Host)',
    [NotificationCode.PARTICIPATION_UPDATED]: 'Participation Updated (Host)',
    [NotificationCode.PARTICIPATION_CANCELLED]: 'Participation Cancelled (Host)',
    [NotificationCode.PARTICIPANT_JOINED]: 'Participant Joined'
};
