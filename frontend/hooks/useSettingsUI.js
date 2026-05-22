import { useCallback, useState } from 'react';


export const useSettingsUI = ({ firstName, lastName, email, onSaveName, onRequestEmailChange, onSavePassword, onDeleteCourses, onDeleteAccount, onChangeProfilePic } = {}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [tempFirstName, setTempFirstName] = useState(firstName);
  const [tempLastName, setTempLastName] = useState(lastName);
  const [tempEmail, setTempEmail] = useState(email);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const startEditName = useCallback(() => setIsEditingName(true), []);
  const cancelEditName = useCallback(() => {
    setIsEditingName(false);
    setTempFirstName(firstName);
    setTempLastName(lastName);
  }, [firstName, lastName]);

  const saveName = useCallback(() => {
    onSaveName?.({ firstName: tempFirstName, lastName: tempLastName });
    setIsEditingName(false);
  }, [onSaveName, tempFirstName, tempLastName]);

  const startEditEmail = useCallback(() => setIsEditingEmail(true), []);
  const cancelEditEmail = useCallback(() => {
    setIsEditingEmail(false);
    setTempEmail(email);
  }, [email]);

  const requestEmailChange = useCallback(() => {
    onRequestEmailChange?.(tempEmail);
    setEmailConfirmationSent(true);
    setIsEditingEmail(false);
  }, [onRequestEmailChange, tempEmail]);

  const cancelEmailChangeFlow = useCallback(() => {
    setEmailConfirmationSent(false);
  }, []);

  const startEditPassword = useCallback(() => setIsEditingPassword(true), []);
  const cancelEditPassword = useCallback(() => {
    setIsEditingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  const savePassword = useCallback(() => {
    onSavePassword?.({ currentPassword, newPassword, confirmPassword });
  }, [confirmPassword, currentPassword, newPassword, onSavePassword]);

  const deleteCourses = useCallback(() => onDeleteCourses?.(), [onDeleteCourses]);
  const deleteAccount = useCallback(() => onDeleteAccount?.(), [onDeleteAccount]);

  const changeProfilePic = useCallback((e) => onChangeProfilePic?.(e), [onChangeProfilePic]);

  return {
    
    isEditingName,
    isEditingEmail,
    isEditingPassword,
    emailConfirmationSent,

    
    tempFirstName,
    tempLastName,
    tempEmail,
    setTempFirstName,
    setTempLastName,
    setTempEmail,

    
    currentPassword,
    newPassword,
    confirmPassword,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,

    
    startEditName,
    cancelEditName,
    saveName,
    startEditEmail,
    cancelEditEmail,
    requestEmailChange,
    cancelEmailChangeFlow,
    startEditPassword,
    cancelEditPassword,
    savePassword,
    deleteCourses,
    deleteAccount,
    changeProfilePic,

    
    setIsEditingName,
    setIsEditingEmail,
    setIsEditingPassword,
    setEmailConfirmationSent,
  };
};
