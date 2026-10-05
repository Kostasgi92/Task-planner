import { shadcn } from '@clerk/themes';

/** Clerk sign-in/up styled to match TaskNest (ported from the original app). */
export const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: '/',
    logoImageUrl: `${window.location.origin}/logo.svg`,
  },
  variables: {
    colorPrimary: '#33435d',
    colorForeground: '#263247',
    colorMutedForeground: '#77808d',
    colorDanger: '#b45345',
    colorBackground: '#fbfaf7',
    colorInput: '#f5f2ec',
    colorInputForeground: '#263247',
    colorNeutral: '#d9d5cc',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.9rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf7] rounded-[28px] w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-serif text-[#263247]',
    headerSubtitle: 'text-[#77808d]',
    socialButtonsBlockButtonText: 'text-[#263247]',
    formFieldLabel: 'text-[#263247]',
    footerActionLink: 'text-[#33435d]',
    footerActionText: 'text-[#77808d]',
    dividerText: 'text-[#77808d]',
    identityPreviewEditButton: 'text-[#33435d]',
    formFieldSuccessText: 'text-[#4e806b]',
    alertText: 'text-[#b45345]',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-[#d9d5cc] bg-white hover:bg-[#f5f2ec]',
    formButtonPrimary: 'bg-[#33435d] text-white hover:bg-[#263247]',
    formFieldInput: 'border-[#d9d5cc] bg-[#f5f2ec] text-[#263247]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d9d5cc]',
    alert: 'border-[#e9c5bd] bg-[#fff5f2]',
    otpCodeFieldInput: 'border-[#d9d5cc] bg-[#f5f2ec]',
    formFieldRow: 'text-[#263247]',
    main: 'bg-transparent',
  },
};

export const clerkLocalization = {
  signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to access your nest' } },
  signUp: { start: { title: 'Create your nest', subtitle: 'Keep your lists together' } },
};
