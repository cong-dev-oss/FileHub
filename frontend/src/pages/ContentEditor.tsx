import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentService, CreateContentDto } from '../services/contentService'
import toast from 'react-hot-toast'
import { Save, ArrowLeft } from 'lucide-react'
import FormField from '../components/FormField'

export default function ContentEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: () => contentService.getById(id!),
    enabled: isEditing,
  })

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<CreateContentDto>({
    defaultValues: {
      title: '',
      description: '',
      body: '',
      contentType: 'Post',
      status: 'Draft',
    },
  })

  useEffect(() => {
    if (content) {
      reset({
        title: content.title,
        description: content.description || '',
        body: content.body,
        contentType: content.contentType,
        status: content.status,
      })
    }
  }, [content, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateContentDto) => contentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content created successfully')
      navigate('/content')
    },
    onError: () => {
      toast.error('Failed to create content')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: CreateContentDto) => contentService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      queryClient.invalidateQueries({ queryKey: ['content', id] })
      toast.success('Content updated successfully')
      navigate('/content')
    },
    onError: () => {
      toast.error('Failed to update content')
    },
  })

  const onSubmit = (data: CreateContentDto) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/content')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Content' : 'New Content'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing ? 'Update your content' : 'Create new content'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6 space-y-6">
        <FormField
          name="title"
          label="Title"
          type="text"
          required
          placeholder="Enter title"
          register={register('title', { required: 'Title is required' })}
          error={errors.title}
        />

        <FormField
          name="description"
          label="Description"
          type="textarea"
          placeholder="Short description (optional)"
          register={register('description')}
        />

        <FormField
          name="body"
          label="Body"
          type="textarea"
          required
          className="font-mono"
          placeholder="Write your content here"
          register={register('body', { required: 'Body is required' })}
          error={errors.body}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="contentType"
            label="Content Type"
            type="select"
            required
            placeholder="Select content type"
            options={[
              { label: 'Page', value: 'Page' },
              { label: 'Post', value: 'Post' },
              { label: 'Media', value: 'Media' },
              { label: 'Custom', value: 'Custom' },
            ]}
            register={register('contentType', { required: 'Content type is required' })}
            error={errors.contentType}
          />

          <FormField
            name="status"
            label="Status"
            type="select"
            required
            placeholder="Select status"
            options={[
              { label: 'Draft', value: 'Draft' },
              { label: 'Published', value: 'Published' },
              { label: 'Archived', value: 'Archived' },
            ]}
            register={register('status', { required: 'Status is required' })}
            error={errors.status}
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/content')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

