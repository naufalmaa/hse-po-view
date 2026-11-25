import React from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { useAppTranslation } from '@/lib/i18n-typed'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    ProfileHeader, TabNavigation, ProfileInfoForm, SecurityForm, SessionList,
    createProfileInfoFormData, createSecurityFormData,
    ProfileInfoFormRef, ProfileLoadingView, ProfileErrorView, SignatureForm, createSignatureFormData, SignatureFormRef
} from '@/components/pages/user/profile'
import { showNotifError, showNotifSuccess } from '@/lib/show-notif'
import { useAuth } from '@/hooks/use-auth'

import { authClient } from '@/lib/auth-client'
import { useChangePassword, useGetUserInfo, UserSession, useUpdateUser, useUserSessionsQuery, useRevokeOtherSessions } from '@/service/user-api'
import { isApproval } from '@/types/auth'

// Add validation for query parameters
const profileSearchSchema = z.object({
    page: z.string().optional().catch('profile'),
})

export const Route = createFileRoute('/_private/user/profile')({
    component: RouteComponent,
    validateSearch: profileSearchSchema,
})

function RouteComponent() {
    const { t } = useAppTranslation();
    const { user: authUser } = useAuth();
    const navigate = Route.useNavigate()
    const search = Route.useSearch()

    // Get the current tab from query parameters or default to 'profile'
    const currentTab = search.page || 'profile'

    // Handle tab change by updating the URL
    const handleTabChange = (value: string) => {
        navigate({
            search: (prev: any) => ({ ...prev, page: value }),
            replace: true,
        })
    }

    // Create ref for ProfileInfoForm
    const profileInfoFormRef = React.useRef<ProfileInfoFormRef>(null);

    // Create ref for SignatureForm
    const signatureFormRef = React.useRef<SignatureFormRef>(null);

    // Fetch user profile data
    const { data: userProfile, isLoading, isError } = useGetUserInfo();

    // Fetch user sessions data
    const { data: sessions, isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useUserSessionsQuery();

    // Define schemas for each tab inside the component to access the translation function
    const profileFormData = createProfileInfoFormData(t);
    const securityFormData = createSecurityFormData(t);
    const signatureFormData = createSignatureFormData(t);

    // Initialize forms for each tab
    const profileForm = useForm<z.infer<typeof profileFormData.schema>>({
        resolver: zodResolver(profileFormData.schema),
        defaultValues: profileFormData.defaultValue,
    })

    const securityForm = useForm<z.infer<typeof securityFormData.schema>>({
        resolver: zodResolver(securityFormData.schema),
        defaultValues: securityFormData.defaultValue,
    })

    // Add signature form
    const signatureForm = useForm<z.infer<typeof signatureFormData.schema>>({
        resolver: zodResolver(signatureFormData.schema),
        defaultValues: signatureFormData.defaultValue,
    })

    // Helper function to populate forms with user data
    const populateForms = (userData: any) => {
        if (userData) {
            profileForm.reset({
                name: userData.name || '',
                email: userData.email || '',
                bio: userData.bio || '',
                image: userData.image || null,
            });

            // Add signature population
            signatureForm.reset({
                signature: userData.signature || null,
            });
        }
    };

    // Populate forms with user data when it loads
    React.useEffect(() => {
        if (userProfile) {
            populateForms(userProfile?.data);
        }
    }, [userProfile, profileForm]);

    // Form submission handlers
    const updateUserProfileMutation = useUpdateUser();
    const changeUserPasswordMutation = useChangePassword();
    const revokeOtherSessionsMutation = useRevokeOtherSessions();
    const [profileUpdateError, setProfileUpdateError] = React.useState<string | null>(null);
    const [securityUpdateError, setSecurityUpdateError] = React.useState<string | null>(null);

    // Unified submit handler for profile and personal info forms (they use the same API)
    const onProfileFormSubmit = (values: Record<string, any>, avatarFile?: File | null) => {
        // Reset relevant error states
        setProfileUpdateError(null);

        // Prepare data for submission
        const submissionData: Record<string, any> = {
            ...values
        };

        // Add avatar file if provided (only for profile form)
        if (avatarFile) {
            submissionData.image = avatarFile;
        }

        updateUserProfileMutation.mutate(
            { body: submissionData },
            {
                onSuccess: (success: Record<string, any>) => {
                    // Reset image state when submission is successful
                    if (profileInfoFormRef.current) {
                        profileInfoFormRef.current.resetImageState();
                    }

                    // Reset forms with updated data from success response
                    populateForms(success.user);

                    // Show success message
                    const successMessage = success?.message || t($ => $.user.profile.information.updateSuccess);
                    showNotifSuccess({ message: successMessage });
                },
                onError: (error: Record<string, any>) => {
                    const msg_ = error?.response?.data?.message || t($ => $.user.profile.information.updateError);
                    setProfileUpdateError(msg_);
                }
            }
        );
    };

    // Security form submit handler (kept separate as it uses a different API)
    const onSecuritySubmit = (values: z.infer<typeof securityFormData.schema>) => {
        setSecurityUpdateError(null);
        changeUserPasswordMutation.mutate(
            { body: { CurrentPassword: values.currentPassword, newPassword: values.newPassword } },
            {
                onSuccess: (success: Record<string, any>) => {
                    const successMessage = success?.message || t($ => $.user.profile.security.updateSuccess);
                    showNotifSuccess({ message: successMessage });
                    // Reset the form after successful submission
                    securityForm.reset(securityFormData.defaultValue);
                },
                onError: (error: Record<string, any>) => {
                    const errorMessage = error?.response?.data?.message || t($ => $.user.profile.security.updateError);
                    setSecurityUpdateError(errorMessage);
                }
            }
        );
    };

    // Add this function to handle session revocation
    const handleRevokeSession = async (sessionToken: string) => {
        await authClient.revokeSession({
            token: sessionToken
        }).then(() => {
            showNotifSuccess({ message: t($ => $.user.profile.sessions.sessionRevoked) });
            refetchSessions();
        }).catch((error: Record<string, any>) => {
            const errorMessage = error?.response?.data?.message || t($ => $.user.profile.sessions.revokeError);
            showNotifError({ message: error?.message || errorMessage });
        });
    };

    const handleRevokeAllSessions = async () => {
        revokeOtherSessionsMutation.mutate(
            { token: authUser?.token || '' },
            {
                onSuccess: () => {
                    showNotifSuccess({ message: t($ => $.user.profile.sessions.allSessionsRevoked) });
                    refetchSessions();
                },
                onError: (error: any) => {
                    const errorMessage = error?.response?.data?.message || t($ => $.user.profile.sessions.revokeError);
                    showNotifError({ message: error?.message || errorMessage });
                }
            }
        );
    };

    // Add signature form submit handler
    const [signatureUpdateError, setSignatureUpdateError] = React.useState<string | null>(null);

    const onSignatureFormSubmit = (values: Record<string, any>, signatureFile?: File | null) => {
        setSignatureUpdateError(null);

        // Prepare data for submission
        const submissionData: Record<string, any> = {
            ...values
        };

        // Add signature file if provided
        if (signatureFile) {
            submissionData.signature = signatureFile;
        }

        updateUserProfileMutation.mutate(
            { body: submissionData },
            {
                onSuccess: (success: Record<string, any>) => {
                    // Reset signature state when submission is successful
                    if (signatureFormRef.current) {
                        signatureFormRef.current.resetSignatureState();
                    }

                    // Reset forms with updated data from success response
                    populateForms(success.user);

                    // Show success message
                    const successMessage = success?.message || t($ => $.user.profile.signature.updateSuccess);
                    showNotifSuccess({ message: successMessage });
                },
                onError: (error: Record<string, any>) => {
                    const msg_ = error?.response?.data?.message || t($ => $.user.profile.signature.updateError);
                    setSignatureUpdateError(msg_);
                }
            }
        );
    };

    if (isLoading) {
        return <ProfileLoadingView isLoading={true} />;
    }

    if (isError) {
        return <ProfileErrorView isError={true} />;
    }

    return (
        <div className="flex flex-col gap-6 w-full">
            <ProfileHeader />

            <Tabs value={currentTab} onValueChange={handleTabChange}>
                <div className="grid md:grid-cols-[220px_minmax(0px,_1fr)] max-w-6xl gap-x-6 w-full ">
                    {/* Navigation Tabs */}
                    <div className="md:col-span-1 w-full">
                        <TabNavigation />
                    </div>

                    {/* Tab Content - Set to same width */}
                    <div className="w-full">
                        {/* Profile Tab */}
                        <TabsContent value="profile" className="mt-0 w-full">
                            <ProfileInfoForm
                                ref={profileInfoFormRef}
                                form={profileForm}
                                onSubmit={onProfileFormSubmit}
                                error={profileUpdateError}
                            />

                            {/* show signature form */}
                            <SignatureForm
                                ref={signatureFormRef}
                                form={signatureForm}
                                onSubmit={onSignatureFormSubmit}
                                error={signatureUpdateError}
                            />
                        </TabsContent>

                        {/* change password */}
                        <TabsContent value="changePassword" className="mt-0 w-full">
                            {userProfile ? (
                                <SecurityForm
                                    form={securityForm}
                                    onSubmit={onSecuritySubmit}
                                    error={securityUpdateError}
                                />
                            ) : (
                                <div className="p-4 text-center">
                                    <p className="text-muted-foreground">
                                        {t($ => $.user.profile.security.notAvailable)}
                                    </p>
                                </div>
                            )}
                        </TabsContent>

                        {/* Security Tab */}
                        <TabsContent value="security" className="mt-0 w-full">
                            <SessionList
                                sessions={sessions as UserSession[]}
                                isLoading={sessionsLoading}
                                isError={sessionsError}
                                currentToken={authUser?.token || null}
                                refetch={refetchSessions}
                                onRevokeSession={handleRevokeSession}
                                onRevokeAllSessions={handleRevokeAllSessions}
                            />
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    )
}