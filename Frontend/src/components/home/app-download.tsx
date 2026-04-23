import { Button } from "@/components/ui/button";

export default function AppDownload() {
  return (
    <div className="py-20 bg-green-600">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h2 className="text-3xl font-bold text-white mb-4">
              Tải ứng dụng SPORTSFIELD
            </h2>
            <p className="text-white mb-6">
              Đặt sân bóng, quản lý lịch đặt và nhận thông báo mọi lúc mọi nơi
              với ứng dụng di động của chúng tôi. Có sẵn trên iOS và Android.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                className="bg-white text-green-600 hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                    fill="currentColor"
                  />
                </svg>
                App Store
              </Button>
              <Button
                variant="outline"
                className="bg-white text-green-600 hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z"
                    fill="currentColor"
                  />
                </svg>
                Google Play
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg w-40 h-40 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="bg-white rounded-lg w-40 h-40 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="col-span-2 bg-white rounded-lg w-full h-40 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
