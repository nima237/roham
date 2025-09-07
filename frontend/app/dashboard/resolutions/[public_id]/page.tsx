'use client';

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Select from "react-select";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileText, 
  faComments, 
  faChartLine, 
  faCog, 
  faArrowRight, 
  faCheck, 
  faReply, 
  faEdit,
  faUsers,
  faUser,
  faPaperPlane,
  faSpinner,
  faCalendar,
  faBuilding,
  faClock,
  faPercent,
  faTag,
  faListAlt,
  faChevronUp,
  faChevronDown,
  faInfoCircle,
  faUserPlus,
  faPaperclip,
  faDownload,
  faTimes,
  faFile,
  faEye,
  faTasks,
  faArrowLeft,
  faHistory
} from '@fortawesome/free-solid-svg-icons';
import { Breadcrumb } from '../../../components/Breadcrumb';
import { ToastContainer } from '../../../components/Toast';
import { ResolutionHeaderSkeleton, ResolutionDetailsSkeleton, InteractionsSkeleton } from '../../../components/SkeletonLoader';
import { getApiUrl } from "../../../utils/api";
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useWebSocketContext } from '../../../providers/WebSocketProvider';
import { toPersianNumbers, formatFileSize } from '../../../utils/persian';

interface Resolution {
  id: string;
  public_id: string;
  meeting: {
    id: string;
    number: number;
    held_at: string;
  };
  clause: string;
  subclause: string;
  description: string;
  type: string;
  status: string;
  progress: number;
  deadline: string;
  executor_unit: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  } | null;
  executor_name: string | null;
  coworkers_ids: number[];
  coworkers_names: string[];
  coworkers?: Array<{
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  }>;
  inform_units?: Array<{
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  }>;
  created_at?: string;
}

interface AttachedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  original_name?: string;
  file_size?: number;
}

interface Interaction {
  id: string;
  content: string;
  created_at: string;
  comment_type: string;
  author: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
  mentions?: User[];
  attachments?: AttachedFile[];
  reply_to?: {
    id: string;
    content: string;
    author: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      department?: string;
    };
  } | null;
  replies?: number;
}

interface ProgressUpdate {
  id: string;
  progress: number;
  description: string;
  created_at: string;
  content: string;
  comment_type: string;
  action_data?: any;
  author: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    department?: string;
  };
}

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  position?: string;
  position_display?: string;
  supervisor?: {
    id: number;
    username: string;
    name: string;
  };
  department?: string;
}

interface InteractionsResponse {
  comments: Interaction[];
  can_accept: boolean;
  can_return: boolean;
  can_edit: boolean;
  can_dialogue: boolean;
  can_chat: boolean;
  is_secretary: boolean;
  is_executor: boolean;
  chat_participants: User[];
}

type ResolutionStatus = 'notified' | 'in_progress' | 'completed' | 'cancelled';

// در قسمت تعریف interface ها
interface AllItem extends Interaction {
  type: 'interaction' | 'progress';
}

interface TimelineItem {
  action: string;
  action_persian: string;
  actor?: {
    id: number;
    name: string;
    position: string;
    department?: string;
  };
  timestamp: string;
  description: string;
  action_data?: any;
}

export default function ResolutionDetailPageProtected() {
  return (
    <ProtectedRoute>
      <ResolutionDetailPage />
    </ProtectedRoute>
  );
}

function ResolutionDetailPage() {
  const [resolution, setResolution] = useState<Resolution | null>(null);

  // تابع recursive برای بررسی زنجیره سرپرستی
  // Cache for hierarchy relationships to avoid repeated API calls
  const [hierarchyCache, setHierarchyCache] = useState<{[key: string]: boolean}>({});

  // Function to check if a participant is in supervisor chain using API
  const checkHierarchyRelationship = async (participantId: number, targetIds: number[]): Promise<boolean> => {
    const cacheKey = `${participantId}-${targetIds.sort().join(',')}`;
    
    // Check cache first
    if (hierarchyCache[cacheKey] !== undefined) {
      return hierarchyCache[cacheKey];
    }

    try {
      const response = await fetch(getApiUrl('hierarchy/check-relationship/'), {
        method: 'POST',
        body: JSON.stringify({
          subordinate_id: participantId,
          supervisor_ids: targetIds
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const result = data.is_subordinate || false;
        
        // Update cache
        setHierarchyCache(prev => ({...prev, [cacheKey]: result}));
        
        return result;
      }
    } catch (error) {
      console.error('Error checking hierarchy relationship:', error);
    }
    
    return false;
  };

  const isInSupervisorChain = (participant: User, targetIds: number[], visited: Set<number> = new Set()): boolean => {
    // For backward compatibility, keep the synchronous check for direct supervisor
    if (!participant.supervisor) return false;
    
    // Direct supervisor check
    if (targetIds.includes(participant.supervisor.id)) {
      return true;
    }
    
    // For deeper hierarchy, we'll need to use async check in getParticipantType
    return false;
  };

  // تابع async برای تشخیص نوع شرکت‌کننده در گروه پیگیری
  const determineParticipantType = async (participant: User): Promise<'executor' | 'coworker' | 'auditor' | 'other'> => {
    if (!resolution) return 'other';
    
    // بررسی ناظر
    if (participant.position === 'auditor') {
      return 'auditor';
    }
    
    // بررسی مدیرعامل (مثل ناظر)
    if (participant.position === 'ceo') {
      return 'auditor';
    }
    
    // بررسی واحد مجری اصلی
    if (resolution.executor_unit && String(resolution.executor_unit.id) === String(participant.id)) {
      return 'executor';
    }
    
    // بررسی واحدهای همکار اصلی
    if (resolution.coworkers_ids && resolution.coworkers_ids.includes(participant.id)) {
      return 'coworker';
    }
    
    // بررسی زنجیره سرپرستی واحد مجری با API
    if (resolution.executor_unit) {
      const isExecutorSubordinate = await checkHierarchyRelationship(participant.id, [resolution.executor_unit.id]);
      if (isExecutorSubordinate) {
        return 'executor';
      }
    }
    
    // بررسی زنجیره سرپرستی واحدهای همکار با API
    if (resolution.coworkers_ids && resolution.coworkers_ids.length > 0) {
      const isCoworkerSubordinate = await checkHierarchyRelationship(participant.id, resolution.coworkers_ids);
      if (isCoworkerSubordinate) {
        return 'coworker';
      }
    }
    
    return 'other';
  };

  // تابع همزمان برای استفاده در render (استفاده از cache شده participant types)
  const getParticipantType = (participant: User): 'executor' | 'coworker' | 'auditor' | 'other' => {
    return participantTypes[participant.id] || 'other';
  };

  // تابع دریافت استایل بر اساس نوع شرکت‌کننده
  const getParticipantStyle = (type: 'executor' | 'coworker' | 'auditor' | 'other', participant?: User) => {
    switch (type) {
      case 'auditor':
        // اگر مدیرعامل باشد، برچسب متفاوتی نمایش دهیم
        if (participant?.position === 'ceo') {
          return {
            bg: 'bg-purple-50 border-purple-200',
            badge: 'bg-purple-500',
            text: 'text-purple-900',
            label: 'مدیرعامل',
            groupLabel: 'مدیرعامل',
            groupColor: 'purple'
          };
        }
        return {
          bg: 'bg-purple-50 border-purple-200',
          badge: 'bg-purple-500',
          text: 'text-purple-900',
          label: 'دستگاه ناظر',
          groupLabel: 'دستگاه ناظر',
          groupColor: 'purple'
        };
      case 'executor':
        return {
          bg: 'bg-blue-50 border-blue-200',
          badge: 'bg-blue-500',
          text: 'text-blue-900',
          label: 'واحد مجری و زیرمجموعه‌ها',
          groupLabel: 'واحد مجری',
          groupColor: 'blue'
        };
      case 'coworker':
        return {
          bg: 'bg-orange-50 border-orange-200',
          badge: 'bg-orange-500',
          text: 'text-orange-900',
          label: 'واحد همکار و زیرمجموعه‌ها',
          groupLabel: 'واحدهای همکار',
          groupColor: 'orange'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          badge: 'bg-gray-500',
          text: 'text-gray-900',
          label: 'سایر شرکت‌کنندگان',
          groupLabel: 'سایر شرکت‌کنندگان',
          groupColor: 'gray'
        };
    }
  };
  const [interactions, setInteractions] = useState<InteractionsResponse | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newInteraction, setNewInteraction] = useState("");
  const [newProgress, setNewProgress] = useState("");
  const [newProgressValue, setNewProgressValue] = useState(0);
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const [canReturn, setCanReturn] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDialogue, setCanDialogue] = useState(false);
  const [canChat, setCanChat] = useState(false);
  const [chatParticipants, setChatParticipants] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionText, setMentionText] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<User[]>([]);
  const [isSecretary, setIsSecretary] = useState(false);
  const [scrollToInteractions, setScrollToInteractions] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [availableSubordinates, setAvailableSubordinates] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [replyingTo, setReplyingTo] = useState<Interaction | null>(null);
  const [showCoworkersModal, setShowCoworkersModal] = useState(false);
  const [activeSection, setActiveSection] = useState('header');
  const [removingParticipantId, setRemovingParticipantId] = useState<number | null>(null);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<{id: number, name: string} | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  
  // Secretary approval modal state
  const [showSecretaryApprovalModal, setShowSecretaryApprovalModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [participantTypes, setParticipantTypes] = useState<{[key: number]: 'executor' | 'coworker' | 'auditor' | 'other'}>({});
  const [coworkerUsers, setCoworkerUsers] = useState<User[]>([]);
  const router = useRouter();
  const params = useParams();
  const interactionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    chatMessages,
    joinChat,
    leaveChat,
    sendChatMessage,
    isConnected
  } = useWebSocketContext();
  const [chatInput, setChatInput] = useState('');
  
  // Check URL parameters for auto-scroll to interactions
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'interactions') {
      setScrollToInteractions(true);
    }
  }, []);
  
  // Auto-scroll to interactions when data is loaded
  useEffect(() => {
    if (scrollToInteractions && interactionsRef.current && !loading) {
      interactionsRef.current.scrollIntoView({ behavior: 'smooth' });
      setScrollToInteractions(false);
    }
  }, [scrollToInteractions, loading]);

  // Calculate participant types when chatParticipants or resolution changes
  useEffect(() => {
    const calculateParticipantTypes = async () => {
      if (!resolution || chatParticipants.length === 0) return;
      
      const newTypes: {[key: number]: 'executor' | 'coworker' | 'auditor' | 'other'} = {};
      
      for (const participant of chatParticipants) {
        const type = await determineParticipantType(participant);
        newTypes[participant.id] = type;
      }
      
      setParticipantTypes(newTypes);
    };
    
    calculateParticipantTypes();
  }, [chatParticipants, resolution]);

  // تعریف گزینه‌های وضعیت بر اساس نقش کاربر
  const getStatusOptions = () => {
    const allOptions = [
      { value: "notified", label: "در حال ابلاغ" },
      { value: "in_progress", label: "در حال اجرا" },
      { value: "completed", label: "تکمیل شده" },
      { value: "cancelled", label: "منتفی" },
      { value: "pending_ceo_approval", label: "منتظر تایید مدیرعامل" },
      { value: "pending_secretary_approval", label: "منتظر تایید دبیر" }
    ];
    if (currentUser?.position === 'auditor') {
      return allOptions.filter(option => 
        option.value !== 'notified' &&
        option.value !== 'in_progress' &&
        option.value !== 'pending_ceo_approval'
      );
    }
    return allOptions;
  };

  const statusOptions = React.useMemo(() => getStatusOptions(), [currentUser]);

  // Fetch user info
  const fetchUserInfo = async () => {
    try {
      const response = await fetch(getApiUrl('user-info/'), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User data received:', userData);
        console.log('User position:', userData.position);
        console.log('User ID:', userData.id, 'Type:', typeof userData.id);
        console.log('User Username:', userData.username);
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    // حذف کامل استفاده از localStorage.getItem("user")
    // اگر نیاز به گرفتن اطلاعات کاربر است، فقط با fetch(getApiUrl('user-info/'), { credentials: 'include' }) انجام شود
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resolutionId = params.public_id as string;
        console.log("Fetching resolution with public_id:", resolutionId);

        // Fetch current user info
        await fetchUserInfo();

        // Fetch resolution details
        const resolutionResponse = await fetch(getApiUrl(`resolutions/${resolutionId}/`), {
          credentials: 'include'
        });

        console.log("Resolution response status:", resolutionResponse.status);

        if (!resolutionResponse.ok) {
          const errorText = await resolutionResponse.text();
          console.error("Resolution fetch error:", errorText);
          
          if (resolutionResponse.status === 401) {
            // toast.error("خطا", "احراز هویت ناموفق. لطفاً دوباره وارد شوید.");
            router.push("/login");
            return;
          } else if (resolutionResponse.status === 403) {
            setError("شما به این مصوبه دسترسی ندارید.");
            return;
          } else if (resolutionResponse.status === 404) {
            setError("مصوبه یافت نشد.");
            return;
          }
          
          throw new Error(`Failed to fetch resolution: ${resolutionResponse.status} ${errorText}`);
        }

        const resolutionData = await resolutionResponse.json();
        setResolution(resolutionData);
        setNewStatus(resolutionData.status);
        setNewProgressValue(resolutionData.progress);
        
        // Fetch coworker user information after resolution data is loaded
        if (resolutionData.coworkers_ids && resolutionData.coworkers_ids.length > 0) {
          fetchCoworkerUsers();
        }

        // Fetch interactions
        const interactionsResponse = await fetch(getApiUrl(`resolutions/${resolutionId}/interactions/`), {
          credentials: 'include'
        });

        if (interactionsResponse.ok) {
          const interactionsData: InteractionsResponse = await interactionsResponse.json();
          setInteractions(interactionsData);
          setCanAccept(interactionsData.can_accept || false);
          setCanReturn(interactionsData.can_return || false);
          setCanEdit(interactionsData.can_edit || false);
          setCanDialogue(interactionsData.can_dialogue || false);
          setCanChat(interactionsData.can_chat || false);
          setIsSecretary(interactionsData.is_secretary || false);
          setChatParticipants(interactionsData.chat_participants || []);
        } else {
          console.error("Failed to fetch interactions:", interactionsResponse.status);
        }

        // Fetch progress updates
        const progressResponse = await fetch(getApiUrl(`resolutions/${resolutionId}/progress/`), {
          credentials: 'include'
        });

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setProgressUpdates(progressData);
        } else {
          console.error("Failed to fetch progress:", progressResponse.status);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        setError("خطا در دریافت اطلاعات");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.public_id, router]);

  // Auto-scroll to bottom when interactions update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [interactions]);

  // Auto-scroll to bottom when first loaded and data is ready
  useEffect(() => {
    if (!loading && interactions && interactions.comments.length > 0 && chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [loading, interactions]);

  useEffect(() => {
    if (resolution?.public_id && isConnected) {
      console.log('🔵 Joining chat for resolution:', resolution.public_id);
      joinChat(resolution.public_id);
      return () => {
        console.log('🔵 Leaving chat for resolution:', resolution.public_id);
        leaveChat(resolution.public_id);
      };
    }
  }, [resolution?.public_id, isConnected]);

  // Listen for chat message updates
  useEffect(() => {
    const handleChatRefresh = (event: CustomEvent) => {
      console.log('🔵 Chat refresh event received:', event.detail);
      // Force re-render by updating a state
      setChatInput(prev => prev); // This will trigger a re-render
    };

    const handleInteractionNotification = (event: CustomEvent) => {
      console.log('🔵 Interaction notification received:', event.detail);
      const interactionData = event.detail.interaction_data;
      
      // Add the new interaction to the existing interactions
      if (interactionData) {
        setInteractions(prevInteractions => {
          if (!prevInteractions) {
            // If no interactions exist yet, create a basic structure
            return {
              comments: [interactionData],
              can_accept: false,
              can_return: false,
              can_edit: false,
              can_dialogue: false,
              can_chat: false,
              is_secretary: false,
              is_executor: false,
              chat_participants: []
            };
          }
          return {
            ...prevInteractions,
            comments: [...prevInteractions.comments, interactionData]
          };
        });
        
        // Scroll to bottom to show new interaction
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }
    };

    window.addEventListener('refreshChatMessages', handleChatRefresh as EventListener);
    window.addEventListener('refreshInteractionNotifications', handleInteractionNotification as EventListener);
    
    return () => {
      window.removeEventListener('refreshChatMessages', handleChatRefresh as EventListener);
      window.removeEventListener('refreshInteractionNotifications', handleInteractionNotification as EventListener);
    };
  }, []); // Remove interactions dependency to prevent listener recreation

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    // اگر فقط فایل انتخاب شده و متن خالی است، خطا بده
    if (!newInteraction.trim() && selectedFile) {
      // toast.error('خطا', 'ارسال توضیحات به همراه فایل الزامی است');
      return;
    }
    console.log('🔵 handleAddInteraction called');
    console.log('  newInteraction:', newInteraction);
    console.log('  newInteraction.trim():', newInteraction.trim());
    console.log('  selectedFile:', selectedFile);
    console.log('  submitting:', submitting);
    
    if (!newInteraction.trim() && !selectedFile) {
      console.log('❌ Returning because both newInteraction and selectedFile are empty');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('content', newInteraction);
      formData.append('comment_type', 'message');
      
      if (selectedMentions.length > 0) {
        const mentionIds = selectedMentions.map(user => user.id);
        formData.append('mentions', JSON.stringify(mentionIds));
      }

      if (selectedFile) {
        formData.append('attachments', selectedFile);
      }

      if (replyingTo) {
        formData.append('reply_to_id', replyingTo.id);
      }

      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/interactions/`), {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        // Don't add to local state - let WebSocket handle it
        setNewInteraction('');
        setSelectedMentions([]);
        setSelectedFile(null);
        setReplyingTo(null);

        // Note: WebSocket will handle adding the message and scrolling
      }
    } catch (error) {
      console.error('Error adding interaction:', error);
      // toast.error('خطا در ارسال پیام', 'لطفاً دوباره تلاش کنید');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgress = async () => {
    console.log('🔵 handleUpdateProgress called');
    console.log('  newProgress:', newProgress);
    console.log('  newProgress.trim():', newProgress.trim());
    console.log('  newProgressValue:', newProgressValue);
    console.log('  submitting:', submitting);
    
    if (!newProgress.trim()) {
      console.log('❌ Returning because newProgress is empty');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/progress/`), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          progress: newProgressValue,
          description: newProgress
        })
      });

      console.log('📡 Response status:', response.status);
      if (response.ok) {
        const newProgressData = await response.json();
        console.log('✅ Progress updated successfully:', newProgressData);
        
        // بعد از ثبت موفق، کل لیست پیشرفت را دوباره از backend بگیریم
        // تا اطمینان حاصل کنیم که اطلاعات همیشه consistent هستند
        const progressResponse = await fetch(getApiUrl(`resolutions/${params.public_id}/progress/`), {
          credentials: 'include'
        });

        if (progressResponse.ok) {
          const updatedProgressData = await progressResponse.json();
          console.log('🔄 Refreshed progress data from backend:', updatedProgressData);
          setProgressUpdates(updatedProgressData);
        } else {
          console.error('❌ Failed to refresh progress data');
          // در صورت خطا در دریافت دوباره، از روش قبلی استفاده کن
          setProgressUpdates([...progressUpdates, newProgressData]);
        }
        
        setNewProgress("");
        
        if (resolution) {
          setResolution({
            ...resolution,
            progress: newProgressValue
          });
        }
        // toast.success('موفق', 'پیشرفت با موفقیت ثبت شد');
      } else {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
        throw new Error("Failed to update progress");
      }
    } catch (err) {
      console.error('❌ Error in handleUpdateProgress:', err);
      // toast.error('خطا', 'خطا در بروزرسانی پیشرفت');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        const updatedResolution = await response.json();
        setResolution(updatedResolution);
        // toast.success('موفق', 'وضعیت با موفقیت بروزرسانی شد');
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      // toast.error('خطا', 'خطا در بروزرسانی وضعیت');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptResolution = async () => {
    console.log('Accept button clicked');
    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/accept/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        // toast.success("مصوبه قبول شد", "مصوبه با موفقیت قبول شد");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        let errorMessage = "خطا در قبول مصوبه";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            console.log('Error data from API:', errorData);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("Accept resolution error:", err);
      // toast.error("خطا در قبول مصوبه", err.message || "خطا در قبول مصوبه");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnResolution = async () => {
    if (!returnReason.trim()) {
      // toast.warning("فیلد اجباری", "دلیل برگشت اجباری است");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/return/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: returnReason
        })
      });

      if (response.ok) {
        // toast.success("مصوبه برگشت داده شد", "مصوبه با موفقیت برگشت داده شد");
        setShowReturnModal(false);
        setReturnReason("");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        let errorMessage = "خطا در برگشت مصوبه";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("Return resolution error:", err);
      // toast.error("خطا در برگشت مصوبه", err.message || "خطا در برگشت مصوبه");
    } finally {
      setSubmitting(false);
    }
  };

  const [localToast, setLocalToast] = useState<{ message: string; type: 'error' | 'success' | 'info' | 'warning' } | null>(null);

  const handleApproveByCEO = async () => {
    if (resolution?.type === 'operational' && (!resolution.deadline || resolution.deadline === '')) {
      setLocalToast({
        message: 'مهلت انجام برای مدیرعامل اجباری است. لطفاً ابتدا مهلت انجام را در بخش ویرایش مصوبه وارد کنید.',
        type: 'error'
      });
      setTimeout(() => {
        setLocalToast(null);
        router.push(`/dashboard/resolutions/edit/${resolution.public_id}`);
      }, 2000);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/approve-ceo/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        // toast.success("مصوبه تایید شد", "مصوبه با موفقیت تایید و ابلاغ شد");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        let errorMessage = "خطا در تایید مصوبه";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("Approve resolution error:", err);
      // toast.error("خطا در تایید مصوبه", err.message || "خطا در تایید مصوبه");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveBySecretary = async (approved: boolean, comment: string = '') => {
    console.log('🔵 handleApproveBySecretary called');
    console.log('  approved:', approved);
    console.log('  comment:', comment);
    console.log('  resolution ID:', params.public_id);
    console.log('  current user:', currentUser);
    console.log('  isSecretary:', isSecretary);
    
    setSubmitting(true);
    try {
      const requestBody = {
        approved: approved,
        comment: comment
      };
      
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/approve-by-secretary/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      console.log('  response status:', response.status);
      console.log('  response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Approval successful:", result);
        
        // اگر مصوبه اطلاع‌رسانی است، نوتیفیکیشن به واحدهای اطلاع‌رسانی ارسال می‌شود
        if (resolution?.type === 'informational') {
          alert("مصوبه اطلاع‌رسانی با موفقیت تایید شد و نوتیفیکیشن به واحدهای اطلاع‌رسانی ارسال شد");
        } else {
          alert("مصوبه با موفقیت تایید شد و برای تایید مدیرعامل ارسال شد");
        }
        
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        let errorMessage = "خطا در عملیات";
        try {
          const contentType = response.headers.get("content-type");
          console.log('  response content-type:', contentType);
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            console.log('  error data:', errorData);
            errorMessage = errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            console.log('  error text:', errorText);
            errorMessage = `خطای سرور: ${response.status} - ${response.statusText}`;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        console.error("❌ Approval failed:", errorMessage);
        alert(errorMessage);
      }
    } catch (err: any) {
      console.error("❌ Secretary approval error:", err);
      alert(err.message || "خطا در عملیات");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "notified":
      case "ابلاغ شده":
      case "در حال ابلاغ":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
      case "در حال اجرا":
        return "bg-blue-100 text-blue-800";
      case "completed":
      case "تکمیل شده":
        return "bg-green-100 text-green-800";
      case "cancelled":
      case "منتفی":
        return "bg-red-100 text-red-800";
      case "pending_ceo_approval":
      case "منتظر تایید مدیرعامل":
        return "bg-purple-100 text-purple-800";
      case "pending_secretary_approval":
      case "منتظر تایید دبیر":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "operational" ? "bg-purple-100 text-purple-800" : "bg-indigo-100 text-indigo-800";
  };

  // تابع برای بررسی اینکه آیا کاربر باید از بخش‌های مدیریتی منع شود یا نه
  const shouldHideManagementSections = () => {
    console.log('shouldHideManagementSections called');
    console.log('currentUser:', currentUser);
    console.log('isSecretary:', isSecretary);
    
    if (!currentUser) return false;
    
    // اگر دبیر باشد، همیشه مخفی شود
    if (isSecretary) return true;
    
    // اگر مدیرعامل باشد، مخفی شود
    if (currentUser.position === 'ceo') {
      console.log('Hiding management sections for CEO');
      return true;
    }
    
    // اگر ناظر باشد، ببیند (فقط ناظر می‌تواند ببیند)
    if (currentUser.position === 'auditor') {
      console.log('Showing management sections for auditor');
      return false;
    }
    
    // بقیه کاربران (مدیر، رئیس اداره، معاون، کارمند و غیره) مخفی شوند
    console.log('Hiding management sections for position:', currentUser.position);
    return true;
  };

  // تابع جداگانه برای بررسی مخفی کردن چت
  const shouldHideChat = () => {
    // اگر مصوبه منتفی باشد، چت را مخفی کن
    if (resolution?.status === 'cancelled') {
      return true;
    }

    // اگر دبیر است و مصوبه در حال ابلاغ است، چت را مخفی کن
    if (isSecretary && resolution?.status === 'notified') {
      return true;
    }

    // اگر دبیر است و مصوبه قبول شده (در حال اجرا)، چت را مخفی کن
    if (isSecretary && resolution?.status === 'in_progress') {
      return true;
    }

    return false;
  };

  // تابع بررسی اینکه آیا کاربر می‌تواند چت کند
  const canUserChat = () => {
    // اگر مصوبه منتفی باشد، چت نکن
    if (resolution?.status === 'cancelled') {
      return false;
    }

    // اگر دبیر است و مصوبه در حال ابلاغ است، چت نکن
    if (isSecretary && resolution?.status === 'notified') {
      return false;
    }

    // اگر دبیر است و مصوبه قبول شده (در حال اجرا)، چت نکن
    if (isSecretary && resolution?.status === 'in_progress') {
      return false;
    }

    // اگر مصوبه تکمیل شده باشد، فقط خواندنی باشد (نمایش چت اما غیرفعال کردن ارسال)
    if (resolution?.status === 'completed') {
      return false;
    }

    // اگر وضعیت "در حال ابلاغ" است
    if (resolution?.status === 'notified') {
      // ناظر، مدیرعامل و مسئول اجرا می‌توانند چت کنند
      const isAuditor = currentUser?.position === 'auditor';
      const isCEO = currentUser?.position === 'ceo';
      const isExecutor = resolution.executor_unit && String(resolution.executor_unit.id) === String(currentUser?.id);
      
      return isAuditor || isCEO || isExecutor;
    }

    // اگر وضعیت "در حال اجرا" است
    if (resolution?.status === 'in_progress') {
      // همه اعضای چت، ناظر و مدیرعامل می‌توانند چت کنند (به جز دبیر)
      const isAuditor = currentUser?.position === 'auditor';
      const isCEO = currentUser?.position === 'ceo';
      return !isSecretary || isAuditor || isCEO;
    }

    // در سایر وضعیت‌ها، همه می‌توانند چت کنند
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewInteraction(value);

    // regex جدید: منشن‌هایی که با فاصله، انتهای خط یا علامت‌گذاری تمام می‌شوند
    const mentionRegex = /@([^@\s,،؛:!\?\n]+(?:\s+[^@\s,،؛:!\?\n]+)*)/g;
    const mentionsInText = [...value.matchAll(mentionRegex)].map(m => m[1].trim());

    setSelectedMentions(prev =>
      prev.filter(user => {
        const userName = user.department || user.username;
        // بررسی وجود دقیق @نام کامل (با فاصله) در متن
        const mentionPattern = new RegExp(`@${userName}(\\s|$|[.,،؛:!\\?\\n])`);
        return mentionPattern.test(value);
      })
    );
    
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // اگر @ وجود دارد و کاربر در حال تایپ کردن منشن است
    if (lastAtIndex !== -1) {
      const mentionQuery = textBeforeCursor.substring(lastAtIndex + 1);
      
      // بررسی اینکه آیا منشن کامل شده یا نه (با فاصله تمام شده)
      const hasSpaceAfter = mentionQuery.includes(' ');
      
      if (hasSpaceAfter) {
        // منشن کامل شده، dropdown را ببند
        setShowMentions(false);
        setMentionText('');
      } else {
        // در حال تایپ منشن
        setShowMentions(true);
        setMentionText(mentionQuery);
      }
    } else {
      // @ وجود ندارد
      setShowMentions(false);
      setMentionText('');
    }
  };

  const handleMentionSelect = (user: User) => {
    const textarea = document.getElementById('interaction-input') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const cursorPosition = textarea.selectionStart || 0;
    const textBeforeCursor = newInteraction.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // نام کاربر برای منشن
    const userName = user.department || user.username;
    
    if (lastAtIndex === -1) {
      // اگر @ پیدا نشد، منشن را در انتهای متن اضافه کن
      const newText = newInteraction + ` @${userName} `;
      setNewInteraction(newText);
      
      // قرار دادن cursor در انتهای متن
      setTimeout(() => {
        if (textarea) {
          const newCursorPosition = newText.length;
          textarea.selectionStart = newCursorPosition;
          textarea.selectionEnd = newCursorPosition;
          textarea.focus();
        }
      }, 0);
    } else {
      // جایگزینی منشن در محل @
      const textAfterCursor = newInteraction.substring(cursorPosition);
      
      // ساخت متن جدید با جایگزینی منشن
      const beforeMention = newInteraction.substring(0, lastAtIndex);
      const afterMention = textAfterCursor;
      const newText = beforeMention + `@${userName} ` + afterMention;
      
      setNewInteraction(newText);
      
      // قرار دادن cursor بعد از منشن
      setTimeout(() => {
        if (textarea) {
          const newCursorPosition = lastAtIndex + userName.length + 2; // @ + نام + فاصله
          textarea.selectionStart = newCursorPosition;
          textarea.selectionEnd = newCursorPosition;
          textarea.focus();
        }
      }, 0);
    }
    
    setShowMentions(false);
    setMentionText('');
    
    if (!selectedMentions.includes(user)) {
      setSelectedMentions([...selectedMentions, user]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // بررسی اندازه فایل (حداکثر 10 مگابایت)
      if (file.size > 10 * 1024 * 1024) {
        // toast.error('خطا', 'اندازه فایل نباید بیشتر از ۱۰ مگابایت باشد');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // تابع بررسی منشن‌ها در متن
  const getMentionStyle = (text: string) => {
    const mentionRegex = /@([^@\s]+(?:\s+[^@\s]+)*)/g;
    const mentions = [...text.matchAll(mentionRegex)];
    
    return mentions.map(match => {
      const [fullMatch, name] = match;
      const mentionedUser = chatParticipants.find(p => {
          const fullName = p.department || p.username;
        return fullName === name;
      });
      
      if (mentionedUser) {
        const participantType = getParticipantType(mentionedUser);
        return {
          text: fullMatch,
          type: participantType,
          user: mentionedUser
        };
      }
      return null;
    }).filter((mention): mention is { text: string; type: 'executor' | 'coworker' | 'auditor' | 'other'; user: User } => mention !== null);
  };

  // تابع نمایش منشن‌ها زیر textarea
  const renderMentionPreview = () => {
    if (selectedMentions.length === 0) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-right" dir="rtl">
        <span className="text-xs text-gray-500">منشن شده‌اند:</span>
        {selectedMentions.map((user, index) => {
          const typeStyle = getParticipantStyle(getParticipantType(user), user);
          return (
            <span
              key={index}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border`}
              style={{
                borderColor: typeStyle.badge.includes('blue') ? '#3b82f6' :
                  typeStyle.badge.includes('orange') ? '#f97316' :
                  typeStyle.badge.includes('purple') ? '#a855f7' : '#6b7280'
              }}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${typeStyle.badge}`}>
                {user.department?.charAt(0) || user.username.charAt(0)}
              </span>
              {user.department || user.username}
            </span>
          );
        })}
      </div>
    );
  };

  const getFilteredParticipants = () => {
    if (!mentionText) return chatParticipants;
    return chatParticipants.filter(p => 
      (p.department && p.department.toLowerCase().includes(mentionText.toLowerCase())) ||
      p.username.toLowerCase().includes(mentionText.toLowerCase())
    );
  };

  const truncateDescription = (description: string, maxLength: number = 300) => {
    const plainText = description.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) return description;
    return plainText.substring(0, maxLength) + '...';
  };

  // بارگذاری لیست مدیرهای زیرمجموعه
  const fetchSubordinates = async () => {
    try {
      const response = await fetch(getApiUrl('users/subordinates/'), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // فیلتر کردن کسانی که در حال حاضر در گروه پیگیری هستند
        const filtered = data.subordinates.filter((user: User) => 
          !chatParticipants.some(participant => participant.id === user.id)
        );
        setAvailableSubordinates(filtered);
      }
    } catch (error) {
      console.error('Error fetching subordinates:', error);
      // toast.error('خطا در بارگذاری', 'لیست مدیرهای زیرمجموعه بارگذاری نشد');
    }
  };

  // بارگذاری اطلاعات همکاران
  const fetchCoworkerUsers = async () => {
    if (!resolution || !resolution.coworkers_ids || resolution.coworkers_ids.length === 0) {
      setCoworkerUsers([]);
      return;
    }

    try {
      const response = await fetch(getApiUrl('users/'), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const allUsers = await response.json();
        // فیلتر کردن همکاران بر اساس IDs
        const coworkers = allUsers.filter((user: User) => 
          resolution.coworkers_ids.includes(user.id)
        );
        setCoworkerUsers(coworkers);
      }
    } catch (error) {
      console.error('Error fetching coworker users:', error);
    }
  };

  // افزودن اعضای انتخاب شده به گروه پیگیری
  const handleAddParticipants = async () => {
    if (selectedParticipants.length === 0) {
      // toast.warning('انتخاب الزامی', 'لطفاً حداقل یک نفر را انتخاب کنید');
      return;
    }

    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/add-participants/`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_ids: selectedParticipants
        }),
      });
      
      if (response.ok) {
        // toast.success('موفقیت', 'اعضای جدید با موفقیت اضافه شدند');
        setShowAddParticipantModal(false);
        setSelectedParticipants([]);
        // بروزرسانی لیست حاضرین - دوباره بارگذاری اطلاعات
        if (params.public_id) {
          try {
            const response = await fetch(getApiUrl(`resolutions/${params.public_id}/interactions/`), {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            if (response.ok) {
              const data: InteractionsResponse = await response.json();
              setChatParticipants(data.chat_participants);
            }
          } catch (error) {
            console.error('Error refreshing participants:', error);
          }
        }
      } else {
        const errorData = await response.json();
        // toast.error('خطا در افزودن', errorData.error || 'خطا در افزودن اعضا');
      }
    } catch (error) {
      console.error('Error adding participants:', error);
      // toast.error('خطا در افزودن', 'خطا در افزودن اعضا');
    }
  };

  // نمایش modal برای افزودن اعضا
  const handleShowAddModal = () => {
    setShowAddParticipantModal(true);
    fetchSubordinates();
  };

  // دریافت مدت زمان حضور کاربر در مصوبه
  const fetchUserDuration = async (userId: number) => {
    setLoadingDuration(true);
    try {
      const response = await fetch(getApiUrl(`resolutions/${params.public_id}/user-duration/${userId}/`), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDurationData(data);
        setShowDurationModal(true);
      } else {
        console.error('Failed to fetch duration data');
        alert('خطا در دریافت اطلاعات مدت زمان');
      }
    } catch (error) {
      console.error('Error fetching duration:', error);
      alert('خطا در دریافت اطلاعات مدت زمان');
    } finally {
      setLoadingDuration(false);
    }
  };

  // حذف کاربر از گروه پیگیری
  const handleRemoveParticipant = (participantId: number, participantName: string) => {
    setParticipantToRemove({ id: participantId, name: participantName });
    setShowRemoveConfirmModal(true);
  };

  const confirmRemoveParticipant = async () => {
    if (!participantToRemove) return;
    
    setRemovingParticipantId(participantToRemove.id);
    setShowRemoveConfirmModal(false);
    
    try {
      const url = `/api/resolutions/${params.public_id}/remove-participant/`;
      console.log('Calling remove participant API:', url, 'with participant_id:', participantToRemove.id);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantToRemove.id
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Remove participant success:', data);
        // toast.success('موفقیت', data.message || 'کاربر با موفقیت حذف شد');
        
        // بروزرسانی لیست حاضرین
        if (params.public_id) {
          try {
            const refreshUrl = getApiUrl(`resolutions/${params.public_id}/interactions/`);
            console.log('Refreshing participants from:', refreshUrl);
            
            const refreshResponse = await fetch(refreshUrl, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            console.log('Refresh response status:', refreshResponse.status);
            
            if (refreshResponse.ok) {
              const refreshData: InteractionsResponse = await refreshResponse.json();
              console.log('New participants list:', refreshData.chat_participants);
              setChatParticipants(refreshData.chat_participants);
            } else {
              console.error('Failed to refresh participants:', refreshResponse.status);
              // اگر refresh موفق نبود، participant را از لیست محلی حذف کن
              setChatParticipants(prev => prev.filter(p => p.id !== participantToRemove.id));
            }
          } catch (error) {
            console.error('Error refreshing participants:', error);
            // اگر refresh موفق نبود، participant را از لیست محلی حذف کن
            setChatParticipants(prev => prev.filter(p => p.id !== participantToRemove.id));
          }
        }
      } else {
        // بررسی اینکه آیا response JSON است یا HTML
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            // toast.error('خطا در حذف', errorData.error || 'خطا در حذف کاربر');
          } catch (e) {
            // toast.error('خطا در حذف', `خطای سرور: ${response.status}`);
          }
        } else {
          // اگر response HTML است (مثل 404 یا 500)
          const htmlText = await response.text();
          console.error('Non-JSON response:', htmlText);
          // toast.error('خطا در حذف', `خطای سرور: ${response.status} - ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      // toast.error('خطا در حذف', 'خطا در حذف کاربر');
    } finally {
      setRemovingParticipantId(null);
      setParticipantToRemove(null);
    }
  };

  const cancelRemoveParticipant = () => {
    setShowRemoveConfirmModal(false);
    setParticipantToRemove(null);
  };

  // بررسی اینکه آیا کاربر جاری می‌تواند کاربر مشخص شده را حذف کند
  const canRemoveParticipant = (participant: User): boolean => {
    if (!currentUser) return false;
    
    // کاربر نمی‌تواند خودش را حذف کند
    if (participant.id === currentUser.id) return false;
    
    // بررسی اینکه آیا participant در زنجیره زیرمجموعه‌های کاربر جاری است یا نه
    const isSubordinate = (p: User, targetUserId: number, visited: Set<number> = new Set()): boolean => {
      if (!p.supervisor) return false;
      
      // جلوگیری از حلقه بی‌نهایت
      if (visited.has(p.id)) return false;
      visited.add(p.id);
      
      // اگر سرپرست مستقیم هدف باشد
      if (p.supervisor.id === targetUserId) {
        return true;
      }
      
      // بررسی recursive: پیدا کردن supervisor در لیست chatParticipants
      const supervisorInList = chatParticipants.find(participant => participant.id === p.supervisor!.id);
      if (supervisorInList) {
        return isSubordinate(supervisorInList, targetUserId, visited);
      }
      
      return false;
    };
    
    return isSubordinate(participant, currentUser.id);
  };

  // تابع نمایش participant با دکمه حذف
  const renderParticipantCard = (participant: User) => {
    const participantType = getParticipantType(participant);
    const style = getParticipantStyle(participantType);
    const canRemove = canRemoveParticipant(participant);
    const isRemoving = removingParticipantId === participant.id;
      const participantName = participant.department || participant.username;

    return (
      <div
        key={participant.id}
        className={`flex items-center gap-2 ${style.bg} border rounded-lg px-3 py-2 ${canRemove ? 'hover:shadow-md transition-shadow' : ''}`}
        title={`${participantName} - ${style.label}`}
      >
        <div className={`w-5 h-5 ${style.badge} text-white rounded-full flex items-center justify-center text-xs font-medium`}>
          {participant.first_name?.charAt(0) || participant.username.charAt(0)}
        </div>
        <span className={`text-sm ${style.text} font-medium flex-1`}>
          {participantName}
        </span>
        <div className="flex gap-1">
          {canRemove && (
            <button
              onClick={() => handleRemoveParticipant(participant.id, participantName)}
              disabled={isRemoving}
              className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRemoving ? (
                <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleReplyToComment = (interaction: Interaction) => {
    setReplyingTo(interaction);
    // Focus on the input field
    setTimeout(() => {
      const textarea = document.querySelector('#interaction-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // اضافه کردن highlight موقتی
      element.classList.add('bg-yellow-100');
      setTimeout(() => {
        element.classList.remove('bg-yellow-100');
      }, 2000);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // واحد مجری و ناظران باید بخش پیشرفت و بروزرسانی‌ها را ببینند
  const shouldShowProgressUpdates = useMemo(() => {
    if (!resolution || resolution.type !== 'operational') return false;
    if (!currentUser) return false;
    
    // واحد مجری همیشه می‌تواند ببیند
    if (resolution.executor_unit && String(resolution.executor_unit.id) === String(currentUser.id)) {
      return true;
    }
    
    // ناظران هم می‌توانند ببینند
    if (currentUser.position === 'auditor') {
      return true;
    }
    
    // مدیرعامل هم می‌تواند ببیند
    if (currentUser.position === 'ceo') {
      return true;
    }
    
    return false;
  }, [resolution, currentUser]);

  // مدیریت برای کاربرانی که نباید بخش‌های مدیریتی را ببینند
  const shouldShowManagementSection = useMemo(() => {
    return !shouldHideManagementSections();
  }, [currentUser]);

  // تشخیص بخش فعال بر اساس scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['header', 'chat'];
      if (shouldShowProgressUpdates) sections.push('progress');
      if (shouldShowManagementSection) sections.push('management');
      
      const scrollPosition = window.scrollY + 200; // offset برای بهتر بودن تشخیص

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // اجرای اولیه

    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldShowProgressUpdates, shouldShowManagementSection]);

  // افزودن این متغیر کمکی بعد از تعریف متغیرهای state:
  const isExecutor = useMemo(() => {
    return currentUser && resolution && resolution.executor_unit && String(currentUser.id) === String(resolution.executor_unit.id);
  }, [currentUser, resolution]);
  const isResolutionAccepted = useMemo(() => {
    return resolution && resolution.status !== 'notified' && resolution.status !== 'ابلاغ شده' && resolution.status !== 'در حال ابلاغ';
  }, [resolution]);

  // state جدید:
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationData, setDurationData] = useState<any>(null);
  const [loadingDuration, setLoadingDuration] = useState(false);

  // ترتیب نقش‌ها برای sort
  const roleOrder: { [key: string]: number } = {
    'deputy': 1,
    'manager': 2,
    'head': 3
  };

  const [mentionIndex, setMentionIndex] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            <ResolutionHeaderSkeleton />
            <ResolutionDetailsSkeleton />
            <InteractionsSkeleton />
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  if (!resolution && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-600 text-lg">{error}</div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'مصوبات', href: '/dashboard/resolutions', icon: faListAlt },
    { label: resolution ? `جلسه ${toPersianNumbers(resolution.meeting.number)} - بند ${toPersianNumbers(resolution.clause)}-${toPersianNumbers(resolution.subclause)}` : 'مصوبه', icon: faFileText }
  ];

  const handleSendChat = async () => {
    if (chatInput && currentUser && resolution?.public_id) {
      try {
        const response = await fetch(getApiUrl(`resolutions/${resolution.public_id}/chat/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: chatInput
          })
        });
        
        if (response.ok) {
          setChatInput('');
          console.log('Chat message sent successfully');
        } else {
          console.error('Failed to send chat message');
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4 lg:p-8">
      <div className="w-full max-w-none">
        <Breadcrumb items={breadcrumbItems} />
        
        {resolution && (
          <div className="space-y-8">
            {/* Navigation Menu */}
            <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-2">
                <div className="space-y-2">
                  {[
                    { id: 'header', icon: faFileText, label: 'جزئیات' },
                    { id: 'chat', icon: faComments, label: 'چت' },
                    ...(shouldShowProgressUpdates ? [
                      { id: 'progress', icon: faChartLine, label: 'پیشرفت' }
                    ] : []),
                    ...(shouldShowManagementSection ? [
                      { id: 'management', icon: faTasks, label: 'مدیریت' }
                    ] : [])
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                        activeSection === item.id 
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                      }`}
                      title={item.label}
                    >
                      <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                      
                      {/* Tooltip */}
                      <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {item.label}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 translate-x-full">
                          <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modern Header Design */}
            <div id="header" className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl shadow-blue-100/50 overflow-hidden relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-8 border-b border-gray-100/50">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <FontAwesomeIcon icon={faFileText} className="text-2xl text-[#003363]" />
                    <h1 className="text-2xl font-bold text-[#003363]">جلسه {toPersianNumbers(resolution.meeting.number)} - بند {toPersianNumbers(resolution.clause)}-{toPersianNumbers(resolution.subclause)}</h1>
                    {resolution.type === 'informational' ? (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold ml-2">اطلاع‌رسانی</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold ml-2">عملیاتی</span>
                    )}
                    {resolution.deadline && (
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold ml-2">
                        مهلت: {toPersianNumbers(new Date(resolution.deadline).toLocaleDateString('fa-IR'))}
                      </span>
                    )}
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${getStatusColor(resolution.status)}`}>
                      {isSecretary
                        ? (statusOptions.find(opt => opt.value === resolution.status)?.label || resolution.status)
                        : (statusOptions.find(opt => opt.value === resolution.status)?.label || statusOptions.find(opt => opt.value === resolution.status)?.label || resolution.status)
                      }
                    </span>
                  </div>

                  {/* اطلاعات واحد مجری، درصد پیشرفت و همکاران */}
                  <div className="flex flex-wrap gap-4 items-center text-sm text-gray-700 mb-2">
                    {resolution.executor_unit && (
                      <span className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 font-bold text-blue-900">
                        <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-blue-600" />
                        واحد مجری: {resolution.executor_unit.department || resolution.executor_unit.username}
                      </span>
                    )}
                    {/* درصد پیشرفت حذف شده چون در تایم‌لاین نمایش داده می‌شود */}
                    {resolution.coworkers && resolution.coworkers.length > 0 && (
                      <span className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1 font-bold text-orange-900">
                        <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-orange-500" />
                        همکاران: {resolution.coworkers.map(user => user.department || user.username).join('، ')}
                      </span>
                    )}
                    {resolution.type === 'informational' && resolution.inform_units && resolution.inform_units.length > 0 && (
                      <span className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1 font-bold text-purple-900">
                        <FontAwesomeIcon icon={faEye} className="w-4 h-4 text-purple-500" />
                        واحدهای مطلع: {resolution.inform_units.map(unit => unit.department || unit.username).join('، ')}
                      </span>
                    )}
                  </div>

                  {/* دکمه‌های تایید و ویرایش برای دبیر و مدیرعامل */}
                  <div className="flex flex-row-reverse gap-2 items-center mb-2">
                    {/* دبیر */}
                    {isSecretary && resolution.status === 'pending_secretary_approval' && (
                      <>
                        <button
                          onClick={() => handleApproveBySecretary(true, '')}
                          disabled={submitting}
                          className="px-5 py-2 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white rounded-xl font-bold shadow-md transition-all duration-200 disabled:opacity-50"
                        >
                          {submitting ? 'در حال تایید...' : 'تایید مصوبه'}
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/resolutions/edit/${resolution.public_id}`)}
                          className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 rounded-xl font-bold shadow-md transition-all duration-200"
                        >
                          ویرایش
                        </button>
                      </>
                    )}
                    {/* مدیرعامل */}
                    {currentUser?.position === 'ceo' && resolution.status === 'pending_ceo_approval' && (
                      <>
                        <button
                          onClick={handleApproveByCEO}
                          disabled={submitting}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                          {submitting ? 'در حال تایید...' : 'تایید مصوبه'}
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/resolutions/edit/${resolution.public_id}`)}
                          className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 rounded-xl font-bold shadow-md transition-all duration-200"
                        >
                          ویرایش
                        </button>
                      </>
                    )}
                  </div>

                  {/* شرح مصوبه */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faFileText} className="w-4 h-4 text-blue-500" />
                      <span className="text-base font-bold text-blue-900">شرح مصوبه</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-gray-800 text-sm leading-relaxed text-justify relative">
                      {isDescriptionExpanded || (resolution.description && resolution.description.length <= 350) ? (
                        <span dangerouslySetInnerHTML={{ __html: resolution.description }} />
                      ) : (
                        <>
                          <span dangerouslySetInnerHTML={{ __html: truncateDescription(resolution.description, 350) }} />
                        </>
                      )}
                      {resolution.description && resolution.description.length > 350 && (
                        <button
                          className="mt-3 text-xs text-blue-700 hover:underline font-bold transition-all rounded-lg px-3 py-1 bg-blue-100 hover:bg-blue-200 z-10 relative"
                          style={{zIndex:10, position:'relative'}} 
                          onClick={() => setIsDescriptionExpanded(v => !v)}
                        >
                          {isDescriptionExpanded ? 'مشاهده کمتر' : 'مشاهده بیشتر'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* دکمه‌های تایید و برگشت - حذف دکمه تایید مصوبه برای CEO از این بخش */}
                  {(isExecutor && resolution.status === 'notified') && (
                    <div className="flex gap-4 mt-6">
                      <button
                        onClick={handleAcceptResolution}
                        disabled={submitting}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                      >
                        {submitting ? 'در حال تایید...' : 'تایید و قبول مصوبه'}
                      </button>
                      <button
                        onClick={() => setShowReturnModal(true)}
                        disabled={submitting}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                      >
                        برگشت به مدیرعامل
                      </button>
                    </div>
                  )}
                </div>
                {/* Progress Circle */}
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                  <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-blue-500"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${resolution.progress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{toPersianNumbers(resolution.progress)}</div>
                        <div className="text-xs text-gray-500">درصد</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">پیشرفت کل</div>
                </div>
              </div>
            </div>

            {/* Interactions Section - مخفی فقط برای دبیر زمانی که مصوبه در حال اجرا است */}
            {!shouldHideChat() && (
              <div 
                id="chat"
                ref={interactionsRef}
                className="bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all duration-300"
              >
              <div className="flex items-center justify-between p-6 border-b border-gray-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faComments} className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">گفتگوها و پیگیری</h2>
                    <p className="text-sm text-gray-500">{toPersianNumbers(interactions?.comments.length || 0)} پیام</p>
                  </div>
                </div>
              </div>

              {resolution.status === "pending_secretary_approval" && isSecretary && (
                null // حذف دکمه‌های تایید و ویرایش دبیر از این بخش
              )}

              {resolution.status === "pending_secretary_approval" && !isSecretary && (
                <div className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-yellow-600" />
                        <h3 className="font-medium text-yellow-800">در انتظار تایید دبیر</h3>
                      </div>
                      <p className="text-sm text-yellow-700">
                        این مصوبه در انتظار تایید دبیر است. پس از تایید، فرآیند عادی ادامه خواهد یافت.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {resolution.status === "returned_to_secretary" && (
                <div className="mx-6 mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faComments} className="w-4 h-4 text-orange-600" />
                        <h3 className="font-medium text-orange-800">گفتگو بین دبیر و معاون</h3>
                      </div>
                      <p className="text-sm text-orange-700 mb-2">
                        این مصوبه برگشت داده شده و در حال گفتگو می‌باشد.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <button
                          onClick={() => {
                            console.log("Edit button clicked, navigating to edit page");
                            router.push(`/dashboard/resolutions/edit/${params.public_id}`);
                          }}
                          className="flex items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
                          ویرایش
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* پیام خواندنی برای مصوبات تکمیل شده */}
              {resolution.status === 'completed' && (
                <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FontAwesomeIcon icon={faEye} className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-blue-800">حالت خواندنی</h3>
                      </div>
                      <p className="text-sm text-blue-700">
                        این مصوبه تکمیل شده است. می‌توانید گفتگوها را مشاهده کنید و اعضای جدید اضافه کنید، اما امکان ارسال پیام جدید وجود ندارد.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {chatParticipants.length > 0 && (
                <div className="mx-6 mt-4 border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-700">حاضرین در گروه پیگیری</h4>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        {toPersianNumbers(chatParticipants.length)}
                      </span>
                    </div>
                    {!isSecretary && (
                      <div
                        style={{ display: "inline-block", position: "relative" }}
                        onClick={e => {
                          if (isExecutor && !isResolutionAccepted) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onMouseEnter={e => {
                          if (isExecutor && !isResolutionAccepted) {
                          }
                        }}
                      >
                        <button
                          onClick={() => {
                            if (isExecutor && !isResolutionAccepted) return;
                            handleShowAddModal();
                          }}
                          className={`flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs transition-colors ${isExecutor && !isResolutionAccepted ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={false}
                        >
                          <FontAwesomeIcon icon={faUserPlus} className="w-3 h-3" />
                          افزودن عضو
                        </button>
                      </div>
                    )}
                  </div>
                  {/* حاضرین به صورت جمع‌وجور و مدرن */}
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-2" style={{maxHeight:'110px'}}>
                    {chatParticipants.map((participant) => {
                      const type = getParticipantType(participant);
                      let bg = '', text = '', icon = faUser, role = '';
                      if (type === 'executor') { bg = 'bg-blue-100 border-blue-400'; text = 'text-blue-900'; icon = faUser; role = 'مجری'; }
                      else if (type === 'coworker') { bg = 'bg-orange-100 border-orange-400'; text = 'text-orange-900'; icon = faUsers; role = 'همکار'; }
                      else if (type === 'auditor') { bg = 'bg-purple-100 border-purple-400'; text = 'text-purple-900'; icon = faEye; role = participant.position === 'ceo' ? 'مدیرعامل' : 'ناظر'; }
                      else { bg = 'bg-gray-100 border-gray-300'; text = 'text-gray-700'; icon = faUser; role = 'سایر'; }
                      const fullName = participant.department || participant.username;
                      const canRemove = canRemoveParticipant(participant);
                      const isRemoving = removingParticipantId === participant.id;
                      return (
                        <div key={participant.id} className={`flex flex-col items-center justify-center border ${bg} rounded-xl px-3 py-2 min-w-[110px] max-w-[140px] relative group`} title={fullName.trim()} style={{minWidth:'110px',maxWidth:'140px'}}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 border-2 ${bg} ${text} font-bold text-base`}>
                            <FontAwesomeIcon icon={icon} className="w-4 h-4" />
                          </div>
                          <div className={`truncate text-xs font-bold ${text} w-full break-words text-center`} style={{wordBreak:'break-word',maxWidth:'100%'}}>{participant.department || participant.username}</div>
                          <div className={`text-[10px] ${text} opacity-70`}>{role}</div>
                          {canRemove && (
                            <button
                              onClick={() => handleRemoveParticipant(participant.id, fullName)}
                              disabled={isRemoving}
                              className="absolute top-1 left-1 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow group-hover:opacity-100 opacity-70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{zIndex:2}}
                              title="حذف از گروه"
                            >
                              {isRemoving ? (
                                <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
                              ) : (
                                <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-6">
                <div ref={chatContainerRef} className="max-h-96 overflow-y-auto pr-2">
                  {(() => {
                    // ترکیب interactions و progress updates با مرتب‌سازی بر اساس تاریخ
                    const allItems: AllItem[] = [
                      ...(interactions?.comments || []).map(item => ({ ...item, type: 'interaction' as const })),
                      ...progressUpdates.map(item => ({ ...item, type: 'progress' as const }))
                    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                    if (allItems.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FontAwesomeIcon icon={faComments} className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-lg">هنوز پیامی ارسال نشده است</p>
                          <p className="text-gray-400 text-sm mt-2">اولین نفری باشید که پیام می‌فرستد</p>
                        </div>
                      );
                    }

                    return allItems.map((item) => {
                      // اگر آیتم progress update است
                      if (item.type === 'progress') {
                        const progressItem = item as ProgressUpdate & { type: string };
                        const userInfo = progressItem.author || progressItem.user;
                        const userName = userInfo ? (userInfo.department || userInfo.username) : 'نامشخص';
                        const progressValue = progressItem.action_data?.new_progress || progressItem.progress || 0;
                        
                        let description = progressItem.description || '';
                        if (!description && progressItem.content) {
                          const parts = progressItem.content.split('\nتوضیحات: ');
                          description = parts.length > 1 ? parts[1] : progressItem.content;
                        }

                        return (
                          <div key={`progress-${progressItem.id}`} className="flex w-full justify-center mb-4">
                            <div className="max-w-[85%]">
                              <div className="backdrop-blur rounded-xl p-4 border bg-gradient-to-r from-green-50/90 to-blue-50/90 border-green-200 text-green-900 shadow-sm">
                                <div className="flex items-center justify-center gap-3 mb-3">
                                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faChartLine} className="w-3 h-3" />
                                  </div>
                                  <span className="font-medium text-sm text-green-900">
                                    {userName} پیشرفت را به {toPersianNumbers(progressValue)}٪ بروزرسانی کرد
                                  </span>
                                  <span className="text-xs text-green-600">
                                    {toPersianNumbers(new Date(progressItem.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}
                                  </span>
                                </div>
                                
                                {/* Progress Bar در چت */}
                                <div className="mb-3">
                                  <div className="w-full bg-green-200/50 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                                      style={{ width: `${progressValue}%` }}
                                    />
                                  </div>
                                </div>
                                
                                {description && (
                                  <div className="text-sm text-center text-green-800 bg-green-100/50 rounded-lg p-2 leading-relaxed">
                                    {description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // اگر آیتم interaction است
                      const interaction = item as Interaction & { type: string };
                      const isCurrentUser = currentUser && (
                        (interaction.user?.id && String(interaction.user.id) === String(currentUser.id)) || 
                        (interaction.author?.id && String(interaction.author.id) === String(currentUser.id)) ||
                        (interaction.user?.username === currentUser.username) ||
                        (interaction.author?.username === currentUser.username)
                      );
                      
                      const isActionComment = interaction.comment_type === 'action';
                      
                      // اگر کامنت action است، در وسط نمایش داده می‌شود
                      if (isActionComment) {
                        return (
                          <div key={`action-${interaction.id}`} className="flex w-full justify-center mb-4">
                            <div className="max-w-[80%]">
                              <div className="backdrop-blur rounded-xl p-3 border bg-orange-50/90 border-orange-200 text-orange-900">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faReply} className="w-2 h-2" />
                                  </div>
                                  <span className="font-medium text-xs text-orange-900">
                                    {interaction.user?.department || interaction.author?.department || interaction.user?.username || interaction.author?.username || 'سیستم'}
                                  </span>
                                  <span className="text-xs text-orange-600">
                                    {toPersianNumbers(new Date(interaction.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}
                                  </span>
                                </div>
                                <div 
                                  className="text-xs text-center text-orange-800"
                                  dangerouslySetInnerHTML={{ __html: interaction.content }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // کامنت‌های عادی - پیام‌های کاربر جاری سمت چپ، دیگران سمت راست
                      return (
                        <div key={`chat-${interaction.id}`} id={`message-${interaction.id}`} className={`flex w-full mb-4 transition-colors ${isCurrentUser ? 'justify-start' : 'justify-end'}`}>
                          <div className="max-w-[70%]">
                            <div className={`rounded-2xl p-4 shadow-lg ${
                              isCurrentUser 
                                ? 'bg-blue-500 text-white rounded-br-md' 
                                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                            }`}>
                              <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'justify-start' : 'justify-end'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isCurrentUser 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-blue-500 text-white'
                                }`}>
                                  {(interaction.user?.department || interaction.author?.department || interaction.user?.username || interaction.author?.username || 'ن').charAt(0)}
                                </div>
                                <div className={`flex flex-col ${isCurrentUser ? 'items-start' : 'items-end'}`}>
                                  <span className={`font-medium text-xs ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                                    {interaction.user?.department || interaction.author?.department || interaction.user?.username || interaction.author?.username || 'نامشخص'}
                                  </span>
                                  <span className={`text-xs ${isCurrentUser ? 'text-white/70' : 'text-gray-500'}`}>
                                    {toPersianNumbers(new Date(interaction.created_at).toLocaleDateString('fa-IR'))} - {toPersianNumbers(new Date(interaction.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}
                                  </span>
                                </div>
                              </div>
                              
                              {/* نمایش پیام reply_to */}
                              {interaction.reply_to && (
                                <div 
                                  onClick={() => scrollToMessage(interaction.reply_to!.id)}
                                  className={`p-3 mb-3 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition-opacity ${
                                    isCurrentUser 
                                      ? 'bg-white/10 border-white/40' 
                                      : 'bg-gray-100 border-gray-400'
                                  }`}
                                >
                                  <div className={`text-xs mb-1 ${
                                    isCurrentUser ? 'text-white/70' : 'text-gray-500'
                                  }`}>
                                    پاسخ به {interaction.reply_to.author.department || interaction.reply_to.author.username}:
                                  </div>
                                  <div className={`text-sm ${
                                    isCurrentUser ? 'text-white/90' : 'text-gray-600'
                                  } whitespace-pre-wrap`}>
                                    {interaction.reply_to.content.length > 100 
                                      ? `${interaction.reply_to.content.substring(0, 100)}...` 
                                      : interaction.reply_to.content
                                    }
                                  </div>
                                </div>
                              )}
                              
                              <div 
                                className={`text-sm leading-relaxed ${isCurrentUser ? 'text-white' : 'text-gray-700'} text-right whitespace-pre-wrap`}
                                dangerouslySetInnerHTML={{ __html: interaction.content }}
                              />
                              
                              {/* نمایش فایل‌های پیوست شده */}
                              {interaction.attachments && interaction.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {interaction.attachments.map((file) => (
                                    <div 
                                      key={file.id} 
                                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        isCurrentUser 
                                          ? 'bg-white/10 border-white/20' 
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isCurrentUser 
                                          ? 'bg-white/20 text-white' 
                                          : 'bg-blue-100 text-blue-600'
                                      }`}>
                                        <FontAwesomeIcon icon={faFile} className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                          isCurrentUser ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {file.original_name || file.name || 'Unknown File'}
                                        </p>
                                        <p className={`text-xs ${
                                          isCurrentUser ? 'text-white/70' : 'text-gray-500'
                                        }`}>
                                          {file.file_size ? formatFileSize(file.file_size) : 
                                           file.size ? formatFileSize(file.size) : 'Unknown size'}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleDownloadFile(file.url, file.original_name || file.name || 'download')}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                          isCurrentUser 
                                            ? 'bg-white/20 hover:bg-white/30 text-white' 
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                        title="دانلود فایل"
                                      >
                                        <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* دکمه‌های عملیات */}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                                <button
                                  onClick={() => handleReplyToComment(interaction)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    isCurrentUser 
                                      ? 'text-white/70 hover:text-white hover:bg-white/10' 
                                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <FontAwesomeIcon icon={faReply} className="w-3 h-3" />
                                  پاسخ
                                </button>
                                
                                {interaction.replies != null && Number(interaction.replies) > 0 && (
                                  <span className={`text-xs ${
                                    isCurrentUser ? 'text-white/70' : 'text-gray-500'
                                  }`}>
                                    {toPersianNumbers(interaction.replies)} پاسخ
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {canUserChat() && (
                <div className="border-t border-gray-100/50 p-6">
                  {/* نمایش پیام غیرفعال برای مصوبات تکمیل شده */}
                  {resolution.status === 'completed' && (
                    <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                        <span className="text-sm">این مصوبه در حالت خواندنی است. امکان ارسال پیام جدید وجود ندارد.</span>
                      </div>
                    </div>
                  )}
                  {/* نمایش حالت reply */}
                  {replyingTo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faReply} className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            در حال پاسخ به {replyingTo.author.department || replyingTo.author.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelReply}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          لغو
                        </button>
                      </div>
                      <div className="text-sm text-blue-700 mt-2 bg-blue-100 rounded-lg p-2 whitespace-pre-wrap">
                        {replyingTo.content.length > 100 
                          ? `${replyingTo.content.substring(0, 100)}...` 
                          : replyingTo.content
                        }
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleAddInteraction} className="space-y-4">
                    <div className="relative">
                      <textarea
                        id="interaction-input"
                        value={newInteraction}
                        onChange={handleInputChange}
                        disabled={resolution.status === 'completed'}
                        onKeyDown={e => {
                          if (showMentions && getFilteredParticipants().length > 0) {
                            if (e.key === 'ArrowDown') {
                              const newIndex = (mentionIndex + 1) % getFilteredParticipants().length;
                              setMentionIndex(newIndex);
                              // اسکرول به آیتم انتخاب شده
                              setTimeout(() => {
                                const selectedElement = document.querySelector(`[data-mention-index="${newIndex}"]`);
                                if (selectedElement) {
                                  selectedElement.scrollIntoView({ 
                                    block: 'nearest', 
                                    behavior: 'smooth' 
                                  });
                                }
                              }, 0);
                              e.preventDefault();
                            } else if (e.key === 'ArrowUp') {
                              const newIndex = (mentionIndex - 1 + getFilteredParticipants().length) % getFilteredParticipants().length;
                              setMentionIndex(newIndex);
                              // اسکرول به آیتم انتخاب شده
                              setTimeout(() => {
                                const selectedElement = document.querySelector(`[data-mention-index="${newIndex}"]`);
                                if (selectedElement) {
                                  selectedElement.scrollIntoView({ 
                                    block: 'nearest', 
                                    behavior: 'smooth' 
                                  });
                                }
                              }, 0);
                              e.preventDefault();
                            } else if (e.key === 'Enter') {
                              handleMentionSelect(getFilteredParticipants()[mentionIndex]);
                              setMentionIndex(0);
                              e.preventDefault();
                            }
                          }
                        }}
                        placeholder="پیام خود را بنویسید..."
                        className="w-full p-4 border border-gray-200 rounded-xl resize-none bg-white/80 backdrop-blur text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-500 text-right mention-textarea"
                        style={{ 
                          direction: 'rtl',
                          lineHeight: '1.5rem'
                        }}
                        rows={3}
                        dir="rtl"
                      />
                      
                      {/* نمایش منشن‌های موجود */}
                      {renderMentionPreview()}
                      
                      {showMentions && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 backdrop-blur-sm">
                          <div className="p-2 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                            <span className="text-xs font-medium text-gray-600">انتخاب کاربر برای منشن</span>
                          </div>
                          <ul className="mention-list bg-white border rounded-lg shadow-lg mt-2 max-h-48 overflow-y-auto">
                            {getFilteredParticipants().map((user, idx) => (
                              <li
                                key={user.id}
                                data-mention-index={idx}
                                className={`mention-item px-3 py-2 cursor-pointer ${mentionIndex === idx ? 'bg-blue-100 text-blue-900 font-bold' : 'text-gray-800'}`}
                                onMouseEnter={() => setMentionIndex(idx)}
                                onClick={() => { handleMentionSelect(user); setMentionIndex(0); }}
                              >
                                <div className="flex items-center gap-2">
                                                                      <span className="text-sm font-medium">
                                      {user.department || user.username}
                                    </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* نمایش فایل انتخاب شده */}
                    {selectedFile && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FontAwesomeIcon icon={faFile} className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-900 truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 transition-colors"
                            title="حذف فایل"
                          >
                            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="پیوست فایل"
                        >
                          <FontAwesomeIcon icon={faPaperclip} className="w-4 h-4" />
                          پیوست فایل
                        </button>
                        {selectedFile && (
                          <span className="text-xs text-gray-500">
                            فایل انتخاب شده: {selectedFile.name}
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={(!newInteraction.trim() && !selectedFile) || submitting || resolution.status === 'completed'}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 transition-all"

                      >
                        <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                        {submitting ? 'در حال ارسال...' : 'ارسال'}
                      </button>
                    </div>
                  </form>
                  
                  {/* Custom CSS for mention highlighting */}
                  <style jsx>{`
                    .mention-textarea {
                      position: relative;
                    }
                    
                    .mention-textarea:focus {
                      outline: none;
                    }
                    
                    /* Highlight mentions with a colored background */
                    .mention-highlight {
                      background: linear-gradient(90deg, 
                        rgba(59, 130, 246, 0.15) 0%, 
                        rgba(59, 130, 246, 0.1) 100%);
                      color: #1e40af;
                      font-weight: 600;
                      padding: 2px 4px;
                      border-radius: 4px;
                      border: 1px solid rgba(59, 130, 246, 0.2);
                    }
                    
                    /* Different colors for different user types */
                    .mention-executor {
                      background: linear-gradient(90deg, 
                        rgba(59, 130, 246, 0.15) 0%, 
                        rgba(59, 130, 246, 0.1) 100%);
                      color: #1e40af;
                      border-color: rgba(59, 130, 246, 0.3);
                    }
                    
                    .mention-coworker {
                      background: linear-gradient(90deg, 
                        rgba(249, 115, 22, 0.15) 0%, 
                        rgba(249, 115, 22, 0.1) 100%);
                      color: #c2410c;
                      border-color: rgba(249, 115, 22, 0.3);
                    }
                    
                    .mention-auditor {
                      background: linear-gradient(90deg, 
                        rgba(168, 85, 247, 0.15) 0%, 
                        rgba(168, 85, 247, 0.1) 100%);
                      color: #7c2d12;
                      border-color: rgba(168, 85, 247, 0.3);
                    }
                    
                    .mention-other {
                      background: linear-gradient(90deg, 
                        rgba(107, 114, 128, 0.15) 0%, 
                        rgba(107, 114, 128, 0.1) 100%);
                      color: #374151;
                      border-color: rgba(107, 114, 128, 0.3);
                    }
                  `}</style>
                </div>
              )}
            </div>
            )}

            {/* پیام برای دبیر زمانی که مصوبه در حال اجرا است */}
            {isSecretary && (resolution.status === 'in_progress' || resolution.status === 'notified') && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faFileText} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">
                      {resolution.status === 'notified' ? 'مصوبه در حال ابلاغ' : 'مصوبه در حال اجرا'}
                    </h3>
                    <p className="text-sm text-blue-700">
                      {resolution.status === 'notified' 
                        ? 'این مصوبه در حال ابلاغ به واحد مجری است' 
                        : 'این مصوبه به مرحله اجرا رسیده است'
                      }
                    </p>
                  </div>
                </div>
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                  <p className="text-sm text-blue-800 leading-relaxed">
                    💡 <strong>توجه:</strong> در این مرحله، بخش گفتگوها و تعاملات برای شما قابل مشاهده نیست. 
                    شما می‌توانید از طریق کارتابل خود وضعیت پیشرفت مصوبه را پیگیری کنید.
                  </p>
                </div>
                {resolution.status === 'in_progress' && resolution.created_at && (
                  <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="mr-3">
                        <p className="text-sm text-blue-700">
                          این مصوبه به دلیل عدم پاسخگویی مجری در مدت 7 روز، به صورت خودکار به وضعیت درحال اجرا تغییر کرد.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress Updates Section - فقط برای واحد مجری */}
            {shouldShowProgressUpdates && (
              <div id="progress" className="bg-white/90 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                    <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    پیشرفت و بروزرسانی‌ها ({toPersianNumbers(progressUpdates.length)})
                  </h2>
                </div>
              
                <div className="space-y-6">
                  {/* فرم ثبت پیشرفت فقط برای واحد مجری (به جز ناظران) */}
                  {(() => {
                    if (!resolution.executor_unit || !currentUser) {
                      return false;
                    }
                    // ناظران نمی‌توانند پیشرفت ثبت کنند
                    if (currentUser.position === 'auditor') {
                      return false;
                    }
                    // اگر مجری است و مصوبه هنوز قبول نشده
                    if (isExecutor && !isResolutionAccepted) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-800 text-center font-medium">
                          برای افزودن پیشرفت، ابتدا باید مصوبه را قبول کنید.
                        </div>
                      );
                    }
                    // اگر مصوبه منتفی یا تکمیل شده باشد، فرم ثبت پیشرفت نمایش داده نشود
                    if (resolution.status === 'completed' || resolution.status === 'تکمیل شده' || resolution.status === 'cancelled' || resolution.status === 'منتفی') {
                      return false;
                    }
                    return String(resolution.executor_unit.id) === String(currentUser.id);
                  })() ? (
                    <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-[#003363] mb-6 flex items-center gap-3">
                        <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-blue-600" />
                        بروزرسانی پیشرفت
                      </h3>
                      
                      <div className="space-y-6">
                        {/* Progress Bar تعاملی */}
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-medium text-gray-700">درصد پیشرفت</label>
                            <div className="flex items-center gap-2">
                              <span className="text-3xl font-bold text-[#003363]">{toPersianNumbers(newProgressValue)}</span>
                              <span className="text-xl text-gray-600">٪</span>
                            </div>
                          </div>
                          
                          {/* Progress Bar تعاملی با Slider ترکیبی */}
                          <div className="relative mb-6">
                            {/* Progress Bar به عنوان پس زمینه */}
                            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out relative"
                                style={{ width: `${newProgressValue}%` }}
                              >
                                {/* نمایش درصد روی progress bar */}
                                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                  {newProgressValue > 10 && `${toPersianNumbers(newProgressValue)}٪`}
                                </div>
                              </div>
                            </div>
                            
                            {/* Range Slider روی progress bar */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={newProgressValue}
                              onChange={(e) => setNewProgressValue(parseInt(e.target.value))}
                              className="absolute top-0 left-0 w-full h-6 bg-transparent appearance-none cursor-pointer slider-overlay"
                            />
                            
                            {/* Progress markers */}
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                              {[0, 25, 50, 75, 100].map(mark => (
                                <span key={mark} className="relative flex flex-col items-center">
                                  <div className="w-0.5 h-2 bg-gray-300"/>
                                  <span className="mt-1">{toPersianNumbers(mark)}٪</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          {/* Quick Select Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {[0, 10, 25, 50, 75, 90, 100].map(value => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setNewProgressValue(value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  newProgressValue === value 
                                    ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg' 
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-blue-50'
                                }`}
                              >
                                {toPersianNumbers(value)}٪
                              </button>
                            ))}
                          </div>
                          
                          <style jsx>{`
                            .slider-overlay::-webkit-slider-thumb {
                              appearance: none;
                              height: 24px;
                              width: 24px;
                              border-radius: 50%;
                              background: linear-gradient(135deg, #3b82f6, #10b981);
                              border: 3px solid white;
                              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                              cursor: pointer;
                            }
                            .slider-overlay::-moz-range-thumb {
                              height: 24px;
                              width: 24px;
                              border-radius: 50%;
                              background: linear-gradient(135deg, #3b82f6, #10b981);
                              border: 3px solid white;
                              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                              cursor: pointer;
                              border: none;
                            }
                            .slider-overlay::-moz-range-track {
                              background: transparent;
                              border: none;
                            }
                          `}</style>
                        </div>

                        {/* توضیحات */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">توضیحات پیشرفت <span className="text-red-500">*</span></label>
                          <textarea
                            value={newProgress}
                            onChange={(e) => setNewProgress(e.target.value)}
                            placeholder="توضیح کاملی از وضعیت فعلی پیشرفت، کارهای انجام شده و برنامه‌های آتی ارائه دهید..."
                            className="w-full border-2 border-blue-300 rounded-xl p-4 text-right text-gray-900 text-sm font-medium resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            dir="rtl"
                          />
                          <div className="text-xs text-gray-500 mt-2">
                            {newProgress.length > 0 && `${toPersianNumbers(newProgress.length)} کاراکتر`}
                          </div>
                        </div>

                        {/* دکمه ثبت */}
                        <div className="flex justify-end">
                          <div
                            style={{ display: "inline-block", position: "relative" }}
                            onClick={e => {
                              if (isExecutor && !isResolutionAccepted) {
                                // toast.warning('مجاز نیست', 'ابتدا باید مصوبه را قبول کنید');
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onMouseEnter={e => {
                              if (isExecutor && !isResolutionAccepted) {
                                // toast.info('اطلاع', 'ابتدا باید مصوبه را قبول کنید');
                              }
                            }}
                          >
                            <button
                              onClick={e => {
                                if (isExecutor && !isResolutionAccepted) return;
                                handleUpdateProgress();
                              }}
                              disabled={!!(submitting || !newProgress.trim())}
                              className="bg-gradient-to-r from-[#003363] to-blue-600 hover:from-[#D39E46] hover:to-orange-500 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                              <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                              {submitting ? "در حال ثبت..." : "ثبت پیشرفت"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-900">اطلاعات ثبت پیشرفت</h3>
                      </div>
                      <p className="text-sm text-blue-800">
                        {currentUser?.position === 'auditor' ? (
                          <>
                            <span className="text-orange-700 font-medium">شما به عنوان ناظر می‌توانید پیشرفت مصوبه را مشاهده کنید.</span>
                            <br />
                            فقط واحد مجری ({resolution.executor_unit?.department || resolution.executor_unit?.username}) می‌تواند پیشرفت جدید ثبت کند.
                          </>
                        ) : currentUser?.position === 'ceo' ? (
                          <>
                            <span className="text-orange-700 font-medium">شما به عنوان مدیرعامل می‌توانید پیشرفت مصوبه را مشاهده کنید.</span>
                            <br />
                            فقط واحد مجری ({resolution.executor_unit?.department || resolution.executor_unit?.username}) می‌تواند پیشرفت جدید ثبت کند.
                          </>
                        ) : (
                          <>
                            فقط واحد مجری این مصوبه ({resolution.executor_unit?.department || resolution.executor_unit?.username}) 
                            می‌تواند درصد پیشرفت را ثبت کند.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Management Section - مخفی برای دبیر، مدیر و رئیس اداره */}
            {shouldShowManagementSection && !(currentUser?.position === 'ceo' && resolution?.status === 'pending_ceo_approval') && (
              <div id="management" className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#003363] mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faTasks} className="w-5 h-5" />
                مدیریت و آمار
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-[#003363] mb-3">مدیریت وضعیت</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">وضعیت جدید</label>
                      <Select
                        options={statusOptions}
                        value={statusOptions.find(opt => opt.value === newStatus)}
                        onChange={(option) => setNewStatus(option?.value || "")}
                        placeholder="انتخاب وضعیت"
                        classNamePrefix="react-select"
                        isDisabled={currentUser?.position === 'auditor' && (resolution.status === 'completed' || resolution.status === 'تکمیل شده' || resolution.status === 'cancelled' || resolution.status === 'منتفی')}
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#D39E46',
                            minHeight: 45,
                            direction: 'rtl',
                            textAlign: 'right',
                            fontWeight: '500',
                            color: '#003363',
                            fontSize: '0.875rem'
                          }),
                          option: (base, state) => ({
                            ...base,
                            color: '#003363',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            backgroundColor: state.isSelected ? '#D39E46' : 'white',
                          }),
                          singleValue: (base) => ({
                            ...base,
                            color: '#003363',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                          })
                        }}
                      />
                    </div>
                    <div>
                      <button
                        onClick={handleUpdateStatus}
                        disabled={submitting || newStatus === resolution?.status || (currentUser?.position === 'auditor' && (resolution.status === 'completed' || resolution.status === 'تکمیل شده' || resolution.status === 'cancelled' || resolution.status === 'منتفی'))}
                        className="w-full bg-[#003363] hover:bg-[#D39E46] text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                      >
                        {submitting ? "در حال بروزرسانی..." : "بروزرسانی وضعیت"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-100 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-800">{toPersianNumbers(interactions?.comments.length || 0)}</div>
                    <div className="text-sm text-blue-600">تعاملات</div>
                  </div>
                  <div className="bg-green-100 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-800">{toPersianNumbers(progressUpdates.length)}</div>
                    <div className="text-sm text-green-600">بروزرسانی پیشرفت</div>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-800">{toPersianNumbers(resolution?.progress || 0)}٪</div>
                    <div className="text-sm text-purple-600">پیشرفت فعلی</div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Modal برگشت مصوبه */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-[#003363] mb-4">
                {isExecutor ? "برگشت مصوبه به مدیرعامل و انتظار تایید مدیرعامل" : "برگشت مصوبه"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">دلیل برگشت *</label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder={isExecutor ? "دلیل برگشت مصوبه به مدیرعامل را شرح دهید..." : "دلیل برگشت مصوبه را شرح دهید..."}
                    className="w-full border-2 border-[#D39E46] rounded-xl p-3 text-right text-gray-900 text-sm font-medium resize-none h-32"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowReturnModal(false);
                      setReturnReason("");
                    }}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleReturnResolution}
                    disabled={submitting || !returnReason.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {submitting ? "در حال ثبت..." : (isExecutor ? "برگشت به مدیرعامل و انتظار تایید مدیرعامل" : "برگشت مصوبه")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal افزودن اعضا به گروه پیگیری */}
        {showAddParticipantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-[#003363] mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUserPlus} className="w-5 h-5" />
                افزودن عضو به گروه پیگیری
              </h2>
              
              {availableSubordinates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    همه مدیرهای زیرمجموعه شما در حال حاضر در گروه پیگیری هستند
                  </div>
                  <button
                    onClick={() => setShowAddParticipantModal(false)}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
                  >
                    بستن
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    مدیرهای زیرمجموعه خود را برای افزودن به گروه پیگیری انتخاب کنید:
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableSubordinates
                      .slice() // کپی برای جلوگیری از تغییر state اصلی
                      .sort((a, b) => {
                        const aOrder = roleOrder[a.position || ''] || 99;
                        const bOrder = roleOrder[b.position || ''] || 99;
                        if (aOrder !== bOrder) return aOrder - bOrder;
                        // اگر نقش برابر بود، بر اساس نام مرتب کن
                          const aName = (a.department || a.username);
  const bName = (b.department || b.username);
                        return aName.localeCompare(bName, 'fa');
                      })
                      .map((subordinate) => (
                        <label
                          key={subordinate.id}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedParticipants.includes(subordinate.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants(prev => [...prev, subordinate.id]);
                              } else {
                                setSelectedParticipants(prev => prev.filter(id => id !== subordinate.id));
                              }
                            }}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {subordinate.first_name?.charAt(0) || subordinate.username.charAt(0)}
                            </div>
                            <div>
                                                              <div className="text-sm font-medium text-gray-900">
                                  {subordinate.department || subordinate.username}
                                </div>
                              {subordinate.position_display && (
                                <div className="text-xs text-gray-500">
                                  {subordinate.position_display}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                  
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowAddParticipantModal(false);
                        setSelectedParticipants([]);
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleAddParticipants}
                      disabled={!!(selectedParticipants.length === 0)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      افزودن به گروه ({toPersianNumbers(selectedParticipants.length)})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal لیست همکاران */}
        {showCoworkersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-[#003363] mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />
                لیست کامل همکاران
              </h2>
              
              {coworkerUsers.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-4">
                    تعداد کل همکاران: {toPersianNumbers(coworkerUsers.length)} نفر
                  </div>
                  
                  <div className="space-y-2">
                    {coworkerUsers.map((coworker, index) => {
                      const displayName = coworker.department || coworker.username;
                      return (
                        <div
                          key={coworker.id}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                            {displayName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {displayName}
                            </div>
                            <div className="text-xs text-gray-500">
                              همکار شماره {toPersianNumbers(index + 1)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    هیچ همکاری برای این مصوبه تعریف نشده است
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t mt-6">
                <button
                  onClick={() => setShowCoworkersModal(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal تأیید حذف کاربر از گروه */}
        {showRemoveConfirmModal && participantToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
              {/* آیکون و عنوان */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={faTimes} className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">حذف از گروه پیگیری</h2>
                <p className="text-gray-600 text-sm">
                  این عمل قابل برگشت نیست
                </p>
              </div>

        {/* Modal تایید مصوبه توسط دبیر */}
        {(() => {
          console.log('🔍 Checking secretary approval modal conditions:');
          console.log('  showSecretaryApprovalModal:', showSecretaryApprovalModal);
          console.log('  approvalAction:', approvalAction);
          console.log('  should show modal:', showSecretaryApprovalModal && approvalAction);
          return showSecretaryApprovalModal && approvalAction;
        })() && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
              {/* آیکون و عنوان */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="w-8 h-8 text-green-500" 
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  تایید مصوبه
                </h2>
                <p className="text-gray-600 text-sm">
                  مصوبه تایید شده و برای تایید مدیرعامل ارسال می‌شود
                </p>
              </div>

              {/* فرم کامنت */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    توضیحات تایید (اختیاری)
                  </label>
                  <textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="توضیحات خود را در مورد تایید مصوبه وارد کنید..."
                    className="w-full border-2 border-gray-300 rounded-xl p-4 text-right text-gray-900 text-sm font-medium resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    dir="rtl"
                  />
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowSecretaryApprovalModal(false);
                      setApprovalComment('');
                      setApprovalAction(null);
                    }}
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={(e) => {
                      console.log('🔵 Modal approval button clicked!');
                      console.log('  approvalComment:', approvalComment);
                      console.log('  submitting:', submitting);
                      
                      e.preventDefault();
                      e.stopPropagation();
                      
                      handleApproveBySecretary(true, approvalComment);
                      setShowSecretaryApprovalModal(false);
                      setApprovalComment('');
                      setApprovalAction(null);
                    }}
                    disabled={submitting}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                    ) : (
                      'تایید مصوبه'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

              {/* متن تأیید */}
              <div className="mb-8">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    آیا مطمئن هستید که می‌خواهید
                  </p>
                  <p className="text-lg font-bold text-gray-900 mt-2 mb-2">
                    {participantToRemove.name}
                  </p>
                  <p className="text-gray-700 text-sm">
                    را از گروه پیگیری این مصوبه حذف کنید؟
                  </p>
                </div>
              </div>

              {/* دکمه‌های عمل */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelRemoveParticipant}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 border border-gray-300 hover:border-gray-400"
                >
                  انصراف
                </button>
                <button
                  onClick={confirmRemoveParticipant}
                  disabled={removingParticipantId === participantToRemove.id}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {removingParticipantId === participantToRemove.id ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                      در حال حذف...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                      حذف از گروه
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal نمایش مدت زمان حضور کاربر */}
        {showDurationModal && durationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto">
              {/* آیکون و عنوان */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={faClock} className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  مدت زمان حضور در مصوبه
                </h2>
                <p className="text-gray-600 text-sm">
                  {durationData.user_name} - {durationData.user_role}
                </p>
              </div>

              {/* اطلاعات مصوبه */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">جلسه:</span>
                    <span className="text-gray-900 mr-2"> {toPersianNumbers(durationData.resolution_info.meeting_number)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">بند:</span>
                    <span className="text-gray-900 mr-2"> {durationData.resolution_info.clause}-{durationData.resolution_info.subclause}</span>
                  </div>
                </div>
              </div>

              {/* آمار کلی */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {toPersianNumbers(durationData.total_periods)}
                  </div>
                  <div className="text-sm text-blue-700">تعداد دوره‌ها</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {durationData.total_duration_formatted}
                  </div>
                  <div className="text-sm text-green-700">کل مدت زمان</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {toPersianNumbers(durationData.average_period_hours.toFixed(1))}
                  </div>
                  <div className="text-sm text-purple-700">میانگین ساعت</div>
                </div>
              </div>

              {/* لیست دوره‌ها */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">جزئیات دوره‌ها</h3>
                {durationData.periods.map((period: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {toPersianNumbers(period.period)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">دوره {toPersianNumbers(period.period)}</div>
                          <div className="text-sm text-gray-500">
                            {period.action_type === 'ongoing' ? 'در حال انجام' : 
                             period.action_type === 'ceo_approved' ? 'تایید مدیرعامل' :
                             period.action_type === 'secretary_approved' ? 'تایید دبیر' :
                             period.action_type === 'executor_accepted' ? 'قبول واحد مجری' :
                             period.action_type === 'return' ? 'برگشت' : period.action_type}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">
                          {period.duration_formatted}
                        </div>
                        {period.ongoing && (
                          <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            در حال انجام
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">شروع:</span>
                        <span className="mr-2"> {new Date(period.start).toLocaleString('fa-IR')}</span>
                      </div>
                      <div>
                        <span className="font-medium">پایان:</span>
                        <span className="mr-2"> {new Date(period.end).toLocaleString('fa-IR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* دکمه بستن */}
              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowDurationModal(false);
                    setDurationData(null);
                  }}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
      <ToastContainer />
      {localToast && (
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-lg shadow-lg text-white font-bold text-base transition-all duration-300 ${localToast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>{localToast.message}</div>
      )}

      {/* --- Timeline Section --- */}
      <div className="mt-16">
        <Timeline publicId={params.public_id ? String(params.public_id) : ''} resolution={resolution} />
      </div>
    </div>
  );
} 

// --- Timeline Component ---
function Timeline({ publicId, resolution }: { publicId: string; resolution: Resolution | null }) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDescModal, setShowDescModal] = useState(false);
  const [descModalText, setDescModalText] = useState('');

  useEffect(() => {
    fetch(`/api/resolutions/${publicId}/timeline/`)
      .then(res => res.json())
      .then(data => {
        setTimeline(data.timeline || []);
        setLoading(false);
      })
      .catch(() => {
        setError('خطا در دریافت تایم‌لاین');
        setLoading(false);
      });
  }, [publicId]);

  const iconMap: Record<string, any> = {
    created: faPaperPlane,
    secretary_approved: faCheck,
    ceo_approved: faCheck,
    executor_accepted: faCheck,
    progress_update: faPercent,
    edit: faEdit,
    return: faArrowLeft,
    return_to_secretary: faArrowLeft,
    default: faHistory
  };
  const colorMap: Record<string, string> = {
    created: 'bg-blue-200 text-blue-800',
    secretary_approved: 'bg-green-200 text-green-800',
    ceo_approved: 'bg-purple-200 text-purple-800',
    executor_accepted: 'bg-orange-200 text-orange-800',
    progress_update: 'bg-yellow-100 text-yellow-700',
    edit: 'bg-gray-200 text-gray-700',
    return: 'bg-red-200 text-red-700',
    return_to_secretary: 'bg-red-200 text-red-700',
    default: 'bg-gray-100 text-gray-500'
  };

  if (loading) return <div className="text-center text-gray-400 py-8">در حال بارگذاری تایم‌لاین...</div>;
  if (error) return <div className="text-center text-red-500 py-8">{error}</div>;
  if (!timeline.length) return <div className="text-center text-gray-400 py-8">هیچ رویدادی ثبت نشده است</div>;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
      <h2 className="text-xl font-bold text-[#003363] mb-6 flex items-center gap-2">
        <FontAwesomeIcon icon={faHistory} className="w-5 h-5" />
        تایم‌لاین مصوبه
      </h2>
      
      {/* اطلاعات واحدهای مطلع */}
      {resolution && resolution.type === 'informational' && resolution.inform_units && resolution.inform_units.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faEye} className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">واحدهای مطلع:</span>
            <span className="text-sm text-gray-900">{resolution.inform_units.map(unit => unit.department || unit.username).join('، ')}</span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto pb-4">
        <div className="relative flex flex-col min-w-[600px]">
          {/* عناوین اکشن‌ها */}
          <div className="flex items-end justify-between mb-2 px-6">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex-1 min-w-[120px] max-w-[180px] text-center">
                <div className="text-xs font-bold text-gray-700 mb-2" style={{wordBreak:'break-word', minHeight: 24}}>{item.action_persian}</div>
              </div>
            ))}
          </div>
          {/* خط و آیکون‌ها */}
          <div className="relative flex items-center justify-between px-6" style={{height:'70px'}}>
            {/* خط ممتد */}
            <div className="absolute top-1/2 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full z-0" style={{transform:'translateY(-50%)', height:'6px'}} />
            {timeline.map((item, idx) => {
              const icon = iconMap[item.action] || iconMap.default;
              const color = colorMap[item.action] || colorMap.default;
              return (
                <div key={idx} className="relative flex flex-col items-center z-10 flex-1 min-w-[120px] max-w-[180px]">
                  <div className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg text-3xl ${color} border-4 border-white`} style={{position:'relative'}}>
                    {item.action === 'progress_update' ? (
                      <>
                        {/* <FontAwesomeIcon icon={icon} /> حذف آیکون درصد */}
                        {item.action_data?.new_progress && (
                          <span className="flex flex-row items-center absolute left-1/2 top-1/2" style={{transform:'translate(-50%,-50%)'}}>
                            <span className="text-3xl font-extrabold">{toPersianNumbers(item.action_data.new_progress)}</span>
                            <span className="text-xs ml-1">٪</span>
                          </span>
                        )}
                      </>
                    ) : (
                      <FontAwesomeIcon icon={icon} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* اطلاعات زیر آیکون‌ها */}
          <div className="flex items-start justify-between mt-4 px-6">
            {timeline.map((item, idx) => {
              const date = new Date(item.timestamp).toLocaleDateString('fa-IR');
              return (
                <div key={idx} className="flex-1 min-w-[120px] max-w-[180px] text-center">
                  <div className="text-xs text-gray-500 mb-1" style={{wordBreak:'break-word'}}>
                    {item.actor?.department || item.actor?.name || ''}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{date}</div>
                  {item.description && (
                    <div className="text-[11px] text-gray-500 text-center" style={{wordBreak:'break-word'}}>
                      {item.description.length > 50 ? (
                        <span className="cursor-pointer underline hover:text-blue-700" onClick={() => { setShowDescModal(true); setDescModalText(item.description); }}>
                          {item.description.substring(0, 50)}... (مشاهده کامل)
                        </span>
                      ) : (
                        item.description
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Modal for full description */}
      {showDescModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-bold text-[#003363] mb-4">توضیحات کامل پیشرفت</h2>
            <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line mb-6" style={{maxHeight:'50vh',overflowY:'auto'}}>{descModalText}</div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDescModal(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}