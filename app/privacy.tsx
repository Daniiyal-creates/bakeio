import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Separator, Typography } from 'heroui-native';

/** Where questions about this policy go. Change this to your own address. */
const CONTACT_EMAIL = 'hello@bakeio.app';

const LAST_UPDATED = '31 August 2026';

type Section = { title: string; paragraphs: string[] };

const SECTIONS: Section[] = [
  {
    title: 'What Bakeio keeps',
    paragraphs: [
      'Your email address, so you can sign in. Bakeio uses a 6-digit code instead of a password.',
      'The bakery information you type in: your name, address, opening hours, products, prices, policies, FAQs and delivery zones.',
      'Your WhatsApp number and the Twilio account details you paste in, so your replies can be sent.',
      'The conversations between your customers and your assistant, so you can read them in the Inbox.',
    ],
  },
  {
    title: 'Your customers’ messages',
    paragraphs: [
      'When somebody messages your WhatsApp number, Twilio delivers that message to Bakeio. Twilio is the company that connects Bakeio to WhatsApp, and the message passes through their systems.',
      'The message text, together with the bakery information you have entered, is sent to Google’s Gemini service, which writes the answer. It is used to produce that one reply.',
      'Messages and phone numbers are stored in your account so the conversation history is there when you open a chat. Bakeio does not contact your customers on its own — it only answers people who wrote to you first.',
    ],
  },
  {
    title: 'Who can see it',
    paragraphs: [
      'Only you. Every row of your data is tied to your account and the database refuses to return it to anyone else.',
      'Your Twilio details are used to send your replies and are never shown to another bakery.',
    ],
  },
  {
    title: 'What Bakeio never does',
    paragraphs: [
      'Your data is not sold, rented, or used for advertising.',
      'Your customers’ messages are not shared with other bakeries.',
    ],
  },
  {
    title: 'Deleting your data',
    paragraphs: [
      'You can delete any product, policy, FAQ or delivery zone at any time, and remove your WhatsApp number from Settings.',
      'To remove everything, open Settings and tap “Delete my account”. That erases your account, your bakery information and every conversation, permanently and immediately. It cannot be undone.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Privacy' }} />
      <ScrollView
        className="bg-background flex-1"
        contentContainerClassName="gap-6 p-5 pb-safe-offset-10"
      >
        <View className="gap-2">
          <Typography.Heading type="h4">Privacy policy</Typography.Heading>
          <Typography type="body-xs" color="muted">
            Last updated {LAST_UPDATED}
          </Typography>
          <Typography type="body-sm" color="muted">
            Bakeio answers your bakery’s WhatsApp messages using only the information you give it.
            This is what that involves, in plain terms.
          </Typography>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} className="gap-3">
            <Separator />
            <Typography type="body" weight="semibold">
              {section.title}
            </Typography>
            {section.paragraphs.map((paragraph) => (
              <Typography key={paragraph} type="body-sm" color="muted">
                {paragraph}
              </Typography>
            ))}
          </View>
        ))}

        <View className="gap-3">
          <Separator />
          <Typography type="body" weight="semibold">
            Questions
          </Typography>
          <Typography type="body-sm" color="muted">
            Write to {CONTACT_EMAIL} and we will answer.
          </Typography>
        </View>
      </ScrollView>
    </>
  );
}
