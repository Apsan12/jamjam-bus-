import React from 'react'

const Sidebar = () => {
  return (
    <div className="w-40 bg-gray-700 min-h-screen p-2 mx-10">
      <ul className="mt-4">
        <li className="py-3 my-3 text-gray-200 text-2xl hover:bg-yellow-700">Bus</li>
        <li className="py-3 my-3 text-gray-200 text-2xl hover:bg-yellow-700">Route</li>
        <li className="py-3 my-3 text-gray-200 text-2xl hover:bg-yellow-700">Bookings</li>
        <li className="py-3 my-3 text-gray-200 text-2xl hover:bg-yellow-700">Message</li>
        <li className="py-3 my-3 text-gray-200 text-2xl hover:bg-yellow-700">Profile</li>

      </ul>
    </div>
  )
}

export default Sidebar
