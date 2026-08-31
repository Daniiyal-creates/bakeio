import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Croissant } from 'lucide-react-native';
import { Button, InputOTP, LinkButton, Typography, useThemeColor } from 'heroui-native';

import { ErrorNote } from '@/components/ConfirmDialog';
import { Field } from '@/components/Field';
import { friendlyError } from '@/lib/backend';
import { sendSignInCode, verifySignInCode } from '@/lib/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const [accent] = useThemeColor(['accent']);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const requestCode = async () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(null);
    setError(null);
    setBusy(true);
    try {
      await sendSignInCode(email);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value: string) => {
    if (value.length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await verifySignInCode(email, value);
      // The gate re-runs and sends the owner to setup or the inbox.
      router.replace('/');
    } catch (err) {
      setError(friendlyError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="px-6 pt-safe-offset-16 pb-12 gap-8 grow justify-center"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-4">
          <View className="bg-dough h-20 w-20 items-center justify-center rounded-3xl">
            <Croissant size={38} color={accent} />
          </View>
          <Typography.Heading type="h2" align="center">
            Bakeio
          </Typography.Heading>
          <Typography type="body" color="muted" align="center">
            Let an assistant answer your bakery&apos;s WhatsApp, using only what you tell it.
          </Typography>
        </View>

        {step === 'email' ? (
          <View className="gap-5">
            <Field
              label="Your email"
              placeholder="you@bakery.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(null);
              }}
              error={emailError}
              hint="We send a 6-digit code. No password to remember."
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              onSubmitEditing={() => void requestCode()}
              returnKeyType="go"
            />

            <ErrorNote message={error} />

            <Button size="lg" isDisabled={busy} onPress={() => void requestCode()}>
              <Button.Label>{busy ? 'Sending…' : 'Send my code'}</Button.Label>
            </Button>

            <LinkButton size="sm" className="self-center" onPress={() => router.push('/privacy')}>
              <LinkButton.Label>How Bakeio handles your data</LinkButton.Label>
            </LinkButton>
          </View>
        ) : (
          <View className="gap-5">
            <View className="gap-1">
              <Typography type="body" weight="semibold">
                Enter your code
              </Typography>
              <Typography type="body-sm" color="muted">
                We sent a 6-digit code to {email.trim().toLowerCase()}.
              </Typography>
            </View>

            <View className="items-center py-2">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={(value) => void submitCode(value)}
                inputMode="numeric"
                isInvalid={Boolean(error)}
              >
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group>
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
            </View>

            <ErrorNote message={error} />

            <Button size="lg" isDisabled={busy} onPress={() => void submitCode(code)}>
              <Button.Label>{busy ? 'Checking…' : 'Continue'}</Button.Label>
            </Button>

            <View className="flex-row items-center justify-center gap-4">
              <LinkButton size="sm" onPress={() => void requestCode()} isDisabled={busy}>
                <LinkButton.Label>Send a new code</LinkButton.Label>
              </LinkButton>
              <LinkButton
                size="sm"
                onPress={() => {
                  setStep('email');
                  setError(null);
                  setCode('');
                }}
              >
                <LinkButton.Label>Change email</LinkButton.Label>
              </LinkButton>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
