import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import CustomAlert from './CustomAlert'
import UserContext from '../context/UserContext'
import PropTypes from 'prop-types'

const UserUpdater = () => {
  const navigateTo = useNavigate()
  // Get the user ID from the URL parameters
  const {id} = useParams()
  // Get access to current user / setUser context
  const {user, setUser} = useContext(UserContext)
  // Handle state of current user to be update
  const [userData, setUserData] = useState(null)
  // Define state variables
  const [ouDivisions, setOuDivisions] = useState([])
  const [showAlert, setShowAlert] = useState(false)

  // Get user details and OU divisions from the backend API
  useEffect(() => {
    // Check if user is an admin, if not, send user back to user page
    if (user.role !== 'Admin'){
      navigateTo('/user-page')
    }

    // Send request to retrieve info for user to update
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/user?id=${id}`, {
          method: 'GET'
        })

        if (response.status === 401) {
          // Redirect user upon authorization failure
          navigateTo('/')
        }
        const json = await response.json()

        /* Transform the received user data to to initial user model format
           As retrieved user info is .populated with mongoose */
        const { _id, username, password, role, divisions, ous } = json
        const transformedData = {
          _id,
          username,
          password,
          role,
          divisions: divisions.map((division) => division._id),
          ous: ous.map((ou) => ou._id),
          __v: 0,
        }

        // Set the transformed user data in the state
        setUserData(transformedData)

      } catch (error) {
        console.log(error)
      }
    }

    // Handle retrieval of all ou and divisions
    const fetchOuDivisions = async () => {
      try {
        // Send request to retrieve ou and divisions info
        const response = await fetch('/api/divisions', {
          method: 'GET'
        })

        if (response.status === 401) {
          // Redirect user upon authorization failure
          navigateTo('/')
        }

        const json = await response.json()
        setOuDivisions(json)
      } catch (error) {
        console.log(error)
      }
    }
    
    // Fetch user data and OU divisions
    fetchUser()
    fetchOuDivisions()
  }, [id, navigateTo, user])

  // Handle adding/removing divisons based on checbox selection
  const handleDivisionChange = (divisionId, ouId) => {
    
    // Add or remove the selected division from the user's divisions
    const updatedDivisions = userData.divisions.includes(divisionId)
      ? userData.divisions.filter((id) => id !== divisionId)
      : [...userData.divisions, divisionId]

    // Check if any division under the OU is selected
    const isOuSelected = ouDivisions.some(
      (division) =>
        division.ou._id === ouId && updatedDivisions.includes(division._id)
    )

    // Update the user data with the new divisions and OUs
    setUserData((prevUserData) => {
      const updatedUserData = {
        ...prevUserData,
        divisions: updatedDivisions,
      }

      // Add or remove the OU based on the division selection
      const ouIndex = updatedUserData.ous.findIndex((ou) => ou === ouId)
      if (isOuSelected && ouIndex === -1) {
        updatedUserData.ous.push(ouId)
      } else if (!isOuSelected && ouIndex !== -1) {
        updatedUserData.ous.splice(ouIndex, 1)
      }

      return updatedUserData
    })
  }

  // Handle user update
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Reset alert status
    setShowAlert(false)

    try {
      // Prepare the updated user data
      const updatedUser = {
        ...userData,
        divisions: userData.divisions.map((divisionId) =>
          divisionId.toString()
        ),
      }

      // Send the updated user data to the backend
      const response = await fetch(`/api/users/update-user?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      })

      // Redirect user upon authorization failure
      if (response.status === 401) {
        navigateTo('/')
      }

      // Handle response
      if (response.ok) {
        setShowAlert(true) 
        
        // Check if updated user is the current user logged in
        // update user context if true
        if (user._id === id) {
          const json = await response.json()
          setUser(json) 
        }
      } else {
        console.log('error updating user')
      }
    } catch (error) {
      console.log(error)
    }
  }

  if (!userData || ouDivisions.length === 0) {
    // Render a loading state until user data and OU divisions are fetched
    return <p>Loading...</p>
  }

  // Group divisions by OU
  const groupedDivisions = {}
  ouDivisions.forEach((division) => {
    const ouId = division.ou._id
    if (!groupedDivisions[ouId]) {
      groupedDivisions[ouId] = {
        ou: division.ou,
        divisions: [],
      }
    }
    groupedDivisions[ouId].divisions.push(division)
  })

  return (
    <>
      <div>
        <h1 className='cooltech-grey'>Update User</h1>
        <h2 className='username'>{userData.username}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              {/* Render dropdown to update user role */}
              <select
                value={userData.role}
                onChange={(e) =>
                  setUserData({ ...userData, role: e.target.value })
                }
              >
                <option value='Normal'>Normal</option>
                <option value='Management'>Management</option>
                <option value='Admin'>Admin</option>
              </select>
            </label>
          </div>
          {/* Loop through divisions grouped by ou */}
          {Object.values(groupedDivisions).map((group) => (
            <div className='update-user' key={group.ou._id}>
              {/* Render ou as header */}
              <h2 className='ous'>{group.ou.name}</h2>
              {group.divisions.map((division) => (  
                <label key={division._id} className='checkbox-label'>
                  {/* Render checkboxes for each division */}
                  <input
                    type='checkbox'
                    value={division._id}
                    checked={userData.divisions.includes(division._id)}
                    onChange={() => handleDivisionChange(division._id, group.ou._id)}
                  />
                  {division.name}
                </label>
              ))}
              <hr></hr>
            </div>
          ))}
          <button type='submit'>Update</button>
        </form>
      </div>
      {showAlert && (
        <CustomAlert message='User successfully updated.' duration={2000} />
      )}
    </>
  )
}

// Prop types validation
UserUpdater.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }),
  }),
}

export default UserUpdater