// ICONS
import { IoCloseSharp } from "react-icons/io5";
import EditPersonalInfo from "./EditPersonaInfo";
import UpdateAvatar from "./UpdateAvatar";
import AddStyle from "./AddStyle";
import EditStyle from "./EditStyle";
import StyleForm from "../../dashboard/forms/StyleForm";

const ModalFrame = ({
  user,
  userType,
  modalType,
  style,
  show,
  handleClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 w-[80%] h-full bg-gray-600 opacity-40"
        onClick={handleClose}
      ></div>
      <div className="flex items-center min-h-screen px-4 py-8 z=50">
        <div className="relative w-full max-w-lg p- mx-auto bg-gray-100 dark:bg-gray-900 rounded-md shadow-lg">
          <div className="flex justify-end">
            <IoCloseSharp
              onClick={handleClose}
              size={24}
              className="cursor-pointer"
              alt="Close Modal"
            />
          </div>

          {modalType === "editPersonalInfo" && (
            <EditPersonalInfo
              user={user}
              userType={userType}
              handleClose={handleClose}
            />
          )}

          {modalType === "editPersonalInfo" && (
            <EditPersonalInfo
              user={user}
              userType={userType}
              handleClose={handleClose}
            />
          )}

          {modalType === "addStyle" && (
            // <StyleForm
            //   user={user}
            //   userType={userType}
            //   handleClose={handleClose}
            // />
            <AddStyle
              user={user}
              userType={userType}
              handleClose={handleClose}
            />
          )}

          {modalType === "editStyle" && (
            <EditStyle
              user={user}
              style={style}
              userType={userType}
              handleClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalFrame;
