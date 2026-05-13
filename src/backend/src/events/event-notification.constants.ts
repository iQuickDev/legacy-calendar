export const EVENT_NOTIFICATION_TITLES = {
    invitationNew: 'New Invitation',
    eventCreated: 'New Event',
    eventUpdated: 'Event Updated',
    eventCancelled: 'Event Cancelled',
    participationAccepted: 'Invite Accepted',
    participationUpdated: 'Participation Updated',
    participationCancelled: 'Participation Cancelled',
    rideAssigned: 'Ride Assigned'
} as const;

export const EVENT_NOTIFICATION_MESSAGES = {
    invitationNew: (actorUsername: string, eventTitle: string) => `${actorUsername} invited you to ${eventTitle}`,
    eventCreated: (actorUsername: string, eventTitle: string) => `${actorUsername} created a new event: ${eventTitle}`,
    eventUpdated: (eventTitle: string) => `Event "${eventTitle}" has been updated.`,
    eventCancelled: (eventTitle: string) => `Event "${eventTitle}" has been cancelled.`,
    participationAccepted: (username: string, eventTitle: string) =>
        `${username} has accepted your invitation to "${eventTitle}"`,
    participationUpdated: (username: string, eventTitle: string) =>
        `${username} has updated their preferences for "${eventTitle}"`,
    participationCancelled: (username: string, eventTitle: string) =>
        `${username} has cancelled their participation in "${eventTitle}"`,
    rideAssigned: (actorUsername: string, eventTitle: string) =>
        `${actorUsername} assigned you to a ride for ${eventTitle}`
} as const;
