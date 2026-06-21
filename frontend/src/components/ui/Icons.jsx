import {
  Hash,
  User,
  Send,
  UserPlus,
  ChevronDown,
  Trash2,
  Pencil,
  SmilePlus,
} from "lucide-react";

export const HashIcon = (props) => <Hash className="icon" {...props} />;
export const UserIcon = (props) => (
  <User className="icon icon-user" {...props} />
);
export const SendIcon = (props) => <Send className="icon-send" {...props} />;
export const AddUserIcon = (props) => <UserPlus className="icon" {...props} />;
export const ChevronDownIcon = (props) => (
  <ChevronDown className="icon" {...props} />
);
export const TrashIcon = (props) => <Trash2 className="icon" {...props} />;
export const RenameIcon = (props) => <Pencil className="icon" {...props} />;
export const EditIcon = (props) => <Pencil className="icon" {...props} />;
export const ReactionIcon = (props) => (
  <SmilePlus className="icon" {...props} />
);
